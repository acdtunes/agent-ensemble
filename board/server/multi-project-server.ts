import { readFileSync } from 'node:fs';
import { readFile as readFileAsync, writeFile as writeFileAsync, access as fsAccess } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { ProjectId, ProjectConfig, ProjectSummary, FeatureSummary, FeatureId, Roadmap, RoadmapTransition, AddProjectError, RemoveProjectError, Result } from '../shared/types.js';
import { createProjectId, deriveProjectSummary } from '../shared/types.js';
import { parseRoadmap } from './parser.js';
import { createFileWatcher, type FileWatcher } from './watcher.js';
import { createProjectRegistry, type ProjectRegistry } from './registry.js';
import { computeTransitions } from './differ.js';
import {
  createSubscriptionServer,
  createMultiProjectHttpApp,
  createHttpServer,
  type SubscriptionServer,
  type HttpServer,
  type DocHttpDeps,
  type BrowseHttpDeps,
} from './index.js';
import { resolveFeatureRoadmap } from './feature-path-resolver.js';
import {
  createProjectDiscovery,
  scanProjectDirsFs,
  type ProjectDiscovery,
  type RegistryActions,
} from './discovery.js';
import { scanDocsDir } from './doc-tree.js';
import { readDocContent } from './doc-content.js';
import { listDirectories, defaultPath } from './browse.js';
import { discoverFeaturesFs } from './feature-discovery.js';
import { resolveArchiveDir } from './archive-path-resolver.js';
import { moveToArchiveFs, scanArchiveDirFs } from './archive-io.js';
import { createFeatureId } from '../shared/types.js';
import { findAllFeatureDocsRoots, type LabeledRoot } from './feature-docs-root.js';
import { existsSync, readdirSync } from 'node:fs';
import { createDirectoryWatcher, type DirectoryWatcher } from './directory-watcher.js';
import { ok, err } from '../shared/types.js';

// --- Projects manifest persistence ---

interface ProjectRegistration {
  readonly projectId: string;
  readonly path: string;
}

interface ProjectsManifest {
  readonly projects: readonly ProjectRegistration[];
}

const deduplicateProjects = (projects: readonly ProjectRegistration[]): readonly ProjectRegistration[] => {
  const seen = new Set<string>();
  return projects.filter((p) => {
    if (seen.has(p.projectId)) return false;
    seen.add(p.projectId);
    return true;
  });
};

const loadProjectsManifest = async (filePath: string): Promise<ProjectsManifest> => {
  try {
    const raw = await readFileAsync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.projects)) {
      return { projects: deduplicateProjects(data.projects) };
    }
  } catch {
    // File doesn't exist or is invalid — start fresh
  }
  return { projects: [] };
};

const saveProjectsManifest = async (filePath: string, manifest: ProjectsManifest): Promise<void> => {
  const json = JSON.stringify(manifest, null, 2) + '\n';
  await writeFileAsync(filePath, json, 'utf-8');
};

const toConfigFromPath = (projectId: ProjectId, projectPath: string): ProjectConfig => ({
  projectId,
  projectPath,
  statePath: join(projectPath, 'state.yaml'),
  planPath: join(projectPath, 'plan.yaml'),
  roadmapPath: join(projectPath, 'roadmap.yaml'),
  docsRoot: join(projectPath, 'docs'),
});

// --- Configuration ---

export interface MultiProjectServerConfig {
  readonly projectsRoot: string;
  readonly wsPort: number;
  readonly httpPort: number;
  readonly pollIntervalMs: number;
}

// --- Composed server ---

export interface MultiProjectServer {
  readonly wsPort: number;
  readonly httpPort: number;
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

// --- Feature watcher lifecycle ---

interface FeatureWatcherManager {
  readonly getRoadmap: (projectId: ProjectId, featureId: FeatureId) => Roadmap | null;
  readonly onSubscribed: (projectId: ProjectId, featureId: FeatureId) => void;
  readonly onUnsubscribed: (projectId: ProjectId, featureId: FeatureId) => void;
  readonly closeAll: () => Promise<void>;
}

interface FeatureWatcherManagerDeps {
  readonly getProjectPath: (projectId: ProjectId) => string | undefined;
  readonly onRoadmapChanged: (
    projectId: ProjectId,
    featureId: FeatureId,
    roadmap: Roadmap,
    transitions: readonly RoadmapTransition[],
  ) => void;
}

const EMPTY_ROADMAP: Roadmap = { roadmap: {}, phases: [] };

const createFeatureWatcherManager = (deps: FeatureWatcherManagerDeps): FeatureWatcherManager => {
  const watchers = new Map<string, FileWatcher>();
  const roadmaps = new Map<string, Roadmap>();

  const toKey = (projectId: ProjectId, featureId: FeatureId): string =>
    `${projectId}:${featureId}`;

  const getRoadmap = (projectId: ProjectId, featureId: FeatureId): Roadmap | null =>
    roadmaps.get(toKey(projectId, featureId)) ?? null;

  const onSubscribed = (projectId: ProjectId, featureId: FeatureId): void => {
    const key = toKey(projectId, featureId);
    if (watchers.has(key)) return;

    const projectPath = deps.getProjectPath(projectId);
    if (!projectPath) return;

    const roadmapPath = resolveFeatureRoadmap(projectPath, featureId);

    const fileResult = readFileSyncResult(roadmapPath);
    if (fileResult.ok) {
      const parsed = parseRoadmap(fileResult.value);
      if (parsed.ok) {
        roadmaps.set(key, parsed.value);
      }
    }

    const watcher = createFileWatcher(roadmapPath, (content) => {
      const parsed = parseRoadmap(content);
      if (!parsed.ok) return;

      const previousRoadmap = roadmaps.get(key) ?? EMPTY_ROADMAP;
      roadmaps.set(key, parsed.value);

      const transitions = computeTransitions(previousRoadmap, parsed.value, new Date().toISOString());
      deps.onRoadmapChanged(projectId, featureId, parsed.value, transitions);
    });

    watchers.set(key, watcher);
  };

  const onUnsubscribed = (projectId: ProjectId, featureId: FeatureId): void => {
    const key = toKey(projectId, featureId);
    const watcher = watchers.get(key);
    if (watcher) {
      watcher.close();
      watchers.delete(key);
      roadmaps.delete(key);
    }
  };

  const closeAll = async (): Promise<void> => {
    await Promise.all([...watchers.values()].map((watcher) => watcher.close()));
    watchers.clear();
    roadmaps.clear();
  };

  return { getRoadmap, onSubscribed, onUnsubscribed, closeAll };
};

// --- Feature directory watcher manager ---

interface FeatureDirectoryWatcherManager {
  readonly startWatching: (projectId: ProjectId, projectPath: string) => Promise<void>;
  readonly stopWatching: (projectId: ProjectId) => Promise<void>;
  readonly closeAll: () => Promise<void>;
}

interface FeatureDirectoryWatcherDeps {
  readonly onDirectoryChanged: (projectId: ProjectId) => void;
}

const createFeatureDirectoryWatcherManager = (
  deps: FeatureDirectoryWatcherDeps,
): FeatureDirectoryWatcherManager => {
  const watchers = new Map<ProjectId, DirectoryWatcher>();

  const startWatching = async (projectId: ProjectId, projectPath: string): Promise<void> => {
    // Don't start duplicate watchers
    if (watchers.has(projectId)) return;

    const watcher = createDirectoryWatcher(projectPath, () => {
      deps.onDirectoryChanged(projectId);
    });

    watchers.set(projectId, watcher);
    await watcher.ready;
  };

  const stopWatching = async (projectId: ProjectId): Promise<void> => {
    const watcher = watchers.get(projectId);
    if (watcher) {
      await watcher.close();
      watchers.delete(projectId);
    }
  };

  const closeAll = async (): Promise<void> => {
    await Promise.all([...watchers.values()].map((watcher) => watcher.close()));
    watchers.clear();
  };

  return { startWatching, stopWatching, closeAll };
};

// --- Synchronous file read adapter ---

const readFileSyncResult = (path: string): Result<string, string> => {
  try {
    return ok(readFileSync(path, 'utf-8'));
  } catch {
    return err(`Failed to read: ${path}`);
  }
};

// --- Wiring: composition root ---

export const createMultiProjectServer = (
  config: MultiProjectServerConfig,
): MultiProjectServer => {

  const toConfigFromDiscovery = (projectId: ProjectId): ProjectConfig =>
    toConfigFromPath(projectId, join(config.projectsRoot, projectId as string));

  // Project path tracking and feature cache for synchronous access
  const pathMap = new Map<ProjectId, string>();
  const featuresCache = new Map<ProjectId, readonly FeatureSummary[]>();

  const refreshFeatures = async (projectId: ProjectId): Promise<void> => {
    const projectPath = pathMap.get(projectId);
    if (!projectPath) return;
    const features = await discoverFeaturesFs(projectPath);
    featuresCache.set(projectId, features);
  };

  const listProjectSummariesWithFeatures = (): readonly ProjectSummary[] =>
    registry.getAll().map((entry) =>
      deriveProjectSummary(entry.projectId, entry.roadmap, featuresCache.get(entry.projectId) ?? []),
    );

  // Registry wired with real deps — subscription server set up below
  let subscriptionServer: SubscriptionServer | null = null;

  const registry: ProjectRegistry = createProjectRegistry({
    createWatcher: createFileWatcher,
    readFile: readFileSyncResult,
    parseRoadmap,
    onStateChange: (projectId, previousRoadmap, newRoadmap) => {
      if (!subscriptionServer) return;
      const transitions = computeTransitions(previousRoadmap, newRoadmap, new Date().toISOString());
      subscriptionServer.notifyProjectUpdate(projectId, newRoadmap, transitions);
    },
  });

  const featureWatcherManager = createFeatureWatcherManager({
    getProjectPath: (projectId) => pathMap.get(projectId),
    onRoadmapChanged: (projectId, featureId, roadmap, transitions) => {
      subscriptionServer?.notifyFeatureUpdate(projectId, featureId, roadmap, transitions);
      // Also refresh the features cache and broadcast project list change
      // so the features list page sees updated summaries
      refreshFeatures(projectId).then(() => subscriptionServer?.notifyProjectListChange());
    },
  });

  // Feature directory watcher — watches for new/deleted feature directories
  const featureDirectoryWatcherManager = createFeatureDirectoryWatcherManager({
    onDirectoryChanged: (projectId) => {
      // Re-run feature discovery and broadcast updated list
      refreshFeatures(projectId).then(() => subscriptionServer?.notifyProjectListChange());
    },
  });

  // Manifest-registered project IDs — discovery must not remove these
  const manifestIds = new Set<ProjectId>();

  // Discovery → Registry bridge
  const registryActions: RegistryActions = {
    add: (projectId: ProjectId) => {
      const projectPath = join(config.projectsRoot, projectId as string);
      pathMap.set(projectId, projectPath);
      registry.add(toConfigFromDiscovery(projectId));
      refreshFeatures(projectId).then(() => subscriptionServer?.notifyProjectListChange());
      // Start watching for feature directory changes
      featureDirectoryWatcherManager.startWatching(projectId, projectPath).catch(() => {});
    },
    remove: (projectId: ProjectId) => {
      if (manifestIds.has(projectId)) return; // Never remove manifest-registered projects
      pathMap.delete(projectId);
      featuresCache.delete(projectId);
      registry.remove(projectId);
      // Stop watching for feature directory changes
      featureDirectoryWatcherManager.stopWatching(projectId).catch(() => {});
      subscriptionServer?.notifyProjectListChange();
    },
    knownIds: () => {
      // Only report discovery-managed IDs so discovery doesn't try to remove manifest projects
      const allIds = new Set(registry.list());
      for (const id of manifestIds) allIds.delete(id);
      return allIds;
    },
  };

  const discovery: ProjectDiscovery = createProjectDiscovery(
    config.projectsRoot,
    registryActions,
    scanProjectDirsFs,
    config.pollIntervalMs,
  );

  // --- Periodic features refresh for real-time updates ---
  let featuresRefreshTimer: ReturnType<typeof setInterval> | null = null;

  const refreshAllFeaturesAndBroadcast = async (): Promise<void> => {
    const projectIds = registry.list();
    const oldCacheJson = JSON.stringify([...featuresCache.entries()].map(([k, v]) => [k, v.map(f => ({ id: f.featureId, done: f.done, inProgress: f.inProgress }))]));

    await Promise.all(projectIds.map(refreshFeatures));

    const newCacheJson = JSON.stringify([...featuresCache.entries()].map(([k, v]) => [k, v.map(f => ({ id: f.featureId, done: f.done, inProgress: f.inProgress }))]));

    // Only broadcast if something changed
    if (oldCacheJson !== newCacheJson) {
      subscriptionServer?.notifyProjectListChange();
    }
  };

  const startFeaturesRefresh = (): void => {
    if (featuresRefreshTimer !== null) return;
    featuresRefreshTimer = setInterval(() => {
      refreshAllFeaturesAndBroadcast().catch(() => {});
    }, config.pollIntervalMs);
  };

  const stopFeaturesRefresh = (): void => {
    if (featuresRefreshTimer !== null) {
      clearInterval(featuresRefreshTimer);
      featuresRefreshTimer = null;
    }
  };

  // Subscription server with live deps from registry
  subscriptionServer = createSubscriptionServer(config.wsPort, {
    getProject: (id) => registry.get(id),
    listProjectSummaries: listProjectSummariesWithFeatures,
    getFeatureRoadmap: featureWatcherManager.getRoadmap,
    onFeatureSubscribed: featureWatcherManager.onSubscribed,
    onFeatureUnsubscribed: featureWatcherManager.onUnsubscribed,
  });

  // Candidate directories for feature docs (ordered by priority)
  const FEATURE_DOCS_DIRS = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;

  // Doc endpoint deps — wired with real scanDocsDir and readDocContent
  const docDeps: DocHttpDeps = {
    getDocsRoot: (projectId) => {
      const projectPath = pathMap.get(projectId);
      if (!projectPath) return undefined;
      return join(projectPath, 'docs');
    },
    getAllFeatureDocsRoots: (projectId: ProjectId, featureId: FeatureId): readonly LabeledRoot[] => {
      const projectPath = pathMap.get(projectId);
      if (!projectPath) return [];
      const listDir = (path: string): string[] => {
        try {
          return readdirSync(path);
        } catch {
          return [];
        }
      };
      return findAllFeatureDocsRoots(
        projectPath,
        featureId as string,
        FEATURE_DOCS_DIRS,
        existsSync,
        listDir,
      );
    },
    scanDocsDir,
    readDocContent,
  };

  // Browse endpoint deps — wired with real listDirectories and defaultPath
  const browseDeps: BrowseHttpDeps = {
    listDirectories,
    defaultPath,
  };

  // Projects manifest state
  const manifestPath = join(config.projectsRoot, '.nw-board-projects.json');
  let projectsManifest: ProjectsManifest = { projects: [] };

  // Project add/remove operations
  const addProject = async (projectPath: string): Promise<Result<ProjectSummary, AddProjectError>> => {
    const dirName = basename(projectPath).toLowerCase();
    const idResult = createProjectId(dirName);
    if (!idResult.ok) {
      return err({ type: 'invalid_path', message: idResult.error });
    }

    // Verify the directory exists
    try {
      await fsAccess(projectPath);
    } catch {
      return err({ type: 'invalid_path', message: `Directory not found: ${projectPath}` });
    }

    pathMap.set(idResult.value, projectPath);
    manifestIds.add(idResult.value);

    const projectConfig = toConfigFromPath(idResult.value, projectPath);
    const addResult = registry.add(projectConfig);
    if (!addResult.ok) {
      pathMap.delete(idResult.value);
      manifestIds.delete(idResult.value);
      return err({ type: 'duplicate', projectId: idResult.value });
    }

    await refreshFeatures(idResult.value);
    // Start watching for feature directory changes
    await featureDirectoryWatcherManager.startWatching(idResult.value, projectPath);

    projectsManifest = {
      projects: [...projectsManifest.projects, { projectId: idResult.value as string, path: projectPath }],
    };
    await saveProjectsManifest(manifestPath, projectsManifest);

    subscriptionServer?.notifyProjectListChange();
    const features = featuresCache.get(idResult.value) ?? [];

    return ok(deriveProjectSummary(idResult.value, addResult.value.roadmap, features));
  };

  const removeProject = async (projectId: ProjectId): Promise<Result<void, RemoveProjectError>> => {
    const removeResult = await registry.remove(projectId);
    if (!removeResult.ok) {
      return err({ type: 'not_found', projectId });
    }

    pathMap.delete(projectId);
    featuresCache.delete(projectId);
    manifestIds.delete(projectId);
    // Stop watching for feature directory changes
    await featureDirectoryWatcherManager.stopWatching(projectId);

    projectsManifest = {
      projects: projectsManifest.projects.filter((p) => p.projectId !== (projectId as string)),
    };
    await saveProjectsManifest(manifestPath, projectsManifest);

    subscriptionServer?.notifyProjectListChange();
    subscriptionServer?.notifyProjectRemoved(projectId);
    return ok(undefined);
  };

  // Feature discovery — HTTP endpoint uses live filesystem, WS uses cache
  const discoverFeatures = async (projectId: ProjectId): Promise<readonly FeatureSummary[]> => {
    const projectPath = pathMap.get(projectId);
    if (!projectPath) return [];
    return discoverFeaturesFs(projectPath);
  };

  // HTTP server
  const httpApp = createMultiProjectHttpApp({
    getProject: (id) => registry.get(id),
    listProjectSummaries: listProjectSummariesWithFeatures,
    docs: docDeps,
    browse: browseDeps,
    addProject,
    removeProject,
    discoverFeatures,
    featureArtifacts: {
      getProjectPath: (projectId) => pathMap.get(projectId),
      readFile: async (path) => {
        try {
          const content = await readFileAsync(path, 'utf-8');
          return ok(content);
        } catch {
          return err(`Failed to read: ${path}`);
        }
      },
    },
    archive: {
      archiveFeature: async (projectId, featureId) => {
        const projectPath = pathMap.get(projectId);
        if (!projectPath) {
          return err({ type: 'feature_not_found' as const, featureId });
        }
        // Move all related directories (feature, ux, requirements) to archive
        const dirsToArchive = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;
        let movedAny = false;
        for (const dir of dirsToArchive) {
          const sourcePath = `${projectPath}/${dir}/${featureId}`;
          const destPath = `${projectPath}/docs/archive/${featureId}/${dir.split('/')[1]}`;
          const result = await moveToArchiveFs(sourcePath, destPath);
          if (result.ok) {
            movedAny = true;
          } else if (result.error.type === 'destination_exists') {
            return err({ type: 'already_archived' as const, featureId });
          }
          // Ignore source_not_found — directory may not exist for all types
        }
        if (!movedAny) {
          return err({ type: 'feature_not_found' as const, featureId });
        }
        return ok(undefined);
      },
      restoreFeature: async (projectId, featureId) => {
        const projectPath = pathMap.get(projectId);
        if (!projectPath) {
          return err({ type: 'feature_not_found' as const, featureId });
        }
        // Restore all subdirectories from archive back to their original locations
        const dirsToRestore = ['feature', 'ux', 'requirements'] as const;
        let restoredAny = false;
        for (const subdir of dirsToRestore) {
          const sourcePath = `${projectPath}/docs/archive/${featureId}/${subdir}`;
          const destPath = `${projectPath}/docs/${subdir}/${featureId}`;
          const result = await moveToArchiveFs(sourcePath, destPath);
          if (result.ok) {
            restoredAny = true;
          } else if (result.error.type === 'destination_exists') {
            return err({ type: 'already_exists' as const, featureId });
          }
          // Ignore source_not_found — subdirectory may not exist
        }
        // Clean up empty archive directory after restore
        try {
          const { rmdir } = await import('node:fs/promises');
          await rmdir(`${projectPath}/docs/archive/${featureId}`);
        } catch {
          // Ignore — directory may not be empty or may not exist
        }
        if (!restoredAny) {
          return err({ type: 'feature_not_found' as const, featureId });
        }
        return ok(undefined);
      },
      listArchivedFeatures: async (projectId) => {
        const projectPath = pathMap.get(projectId);
        if (!projectPath) {
          return [];
        }
        const archiveDir = `${projectPath}/docs/archive`;
        const result = await scanArchiveDirFs(archiveDir);
        if (!result.ok) {
          return [];
        }
        return result.value.map((entry) => ({
          featureId: entry.featureId as FeatureId,
          name: entry.featureId,
          archivedAt: entry.archivedAt,
        }));
      },
    },
  });
  const httpServer: HttpServer = createHttpServer(httpApp, config.httpPort);

  // Ready: load manifest, initial discovery, servers listening
  const ready = (async () => {
    await Promise.all([subscriptionServer!.ready, httpServer.ready]);

    // Load projects manifest and register persisted projects
    projectsManifest = await loadProjectsManifest(manifestPath);
    for (const registration of projectsManifest.projects) {
      const idResult = createProjectId(registration.projectId);
      if (idResult.ok) {
        manifestIds.add(idResult.value);
        pathMap.set(idResult.value, registration.path);
        registry.add(toConfigFromPath(idResult.value, registration.path));
        // Start watching for feature directory changes
        featureDirectoryWatcherManager.startWatching(idResult.value, registration.path).catch(() => {});
      }
    }

    // Persist deduplicated manifest
    await saveProjectsManifest(manifestPath, projectsManifest);

    await discovery.poll();
    discovery.start();

    // Populate features cache for all registered projects
    await Promise.all(registry.list().map(refreshFeatures));

    // Start periodic features refresh for real-time updates
    startFeaturesRefresh();
  })();

  const close = async (): Promise<void> => {
    discovery.stop();
    stopFeaturesRefresh();
    await featureDirectoryWatcherManager.closeAll();
    await featureWatcherManager.closeAll();
    await registry.close();
    await subscriptionServer!.close();
    await httpServer.close();
  };

  return {
    get wsPort() { return subscriptionServer!.port; },
    get httpPort() { return httpServer.port; },
    ready,
    close,
  };
};

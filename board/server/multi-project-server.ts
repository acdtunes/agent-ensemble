import { readFileSync } from 'node:fs';
import { readFile as readFileAsync, writeFile as writeFileAsync, access as fsAccess } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { ProjectId, ProjectConfig, ProjectSummary, FeatureSummary, FeatureId, AddProjectError, RemoveProjectError, Result } from '../shared/types.js';
import { createProjectId, deriveProjectSummary } from '../shared/types.js';
import { parseRoadmap, roadmapToDeliveryState, roadmapToExecutionPlan } from './parser.js';
import { createFileWatcher } from './watcher.js';
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

  const toConfigFromDiscovery = (projectId: ProjectId): ProjectConfig => ({
    projectId,
    projectPath: join(config.projectsRoot, projectId as string),
    statePath: join(config.projectsRoot, projectId as string, 'state.yaml'),
    planPath: join(config.projectsRoot, projectId as string, 'plan.yaml'),
    roadmapPath: join(config.projectsRoot, projectId as string, 'roadmap.yaml'),
    docsRoot: join(config.projectsRoot, projectId as string, 'docs'),
  });

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
      deriveProjectSummary(entry.projectId, entry.state, featuresCache.get(entry.projectId) ?? []),
    );

  // Registry wired with real deps — subscription server set up below
  let subscriptionServer: SubscriptionServer | null = null;

  const registry: ProjectRegistry = createProjectRegistry({
    createWatcher: createFileWatcher,
    readFile: readFileSyncResult,
    parseRoadmap,
    roadmapToDeliveryState,
    roadmapToExecutionPlan,
    onStateChange: (projectId, previousState, newState) => {
      if (!subscriptionServer) return;
      const transitions = computeTransitions(previousState, newState, new Date().toISOString());
      subscriptionServer.notifyProjectUpdate(projectId, newState, transitions);
    },
  });

  // Manifest-registered project IDs — discovery must not remove these
  const manifestIds = new Set<ProjectId>();

  // Discovery → Registry bridge
  const registryActions: RegistryActions = {
    add: (projectId: ProjectId) => {
      pathMap.set(projectId, join(config.projectsRoot, projectId as string));
      registry.add(toConfigFromDiscovery(projectId));
      refreshFeatures(projectId).then(() => subscriptionServer?.notifyProjectListChange());
    },
    remove: (projectId: ProjectId) => {
      if (manifestIds.has(projectId)) return; // Never remove manifest-registered projects
      pathMap.delete(projectId);
      featuresCache.delete(projectId);
      registry.remove(projectId);
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

  // Subscription server with live deps from registry
  subscriptionServer = createSubscriptionServer(config.wsPort, {
    getProject: (id) => registry.get(id),
    listProjectSummaries: listProjectSummariesWithFeatures,
  });

  // Doc endpoint deps — wired with real scanDocsDir and readDocContent
  const docDeps: DocHttpDeps = {
    getDocsRoot: (projectId) => {
      const projectPath = pathMap.get(projectId);
      if (!projectPath) return undefined;
      return join(projectPath, 'docs');
    },
    getFeatureDocsRoot: (projectId: ProjectId, featureId: FeatureId) => {
      const projectPath = pathMap.get(projectId);
      if (!projectPath) return undefined;
      return join(projectPath, 'docs', 'feature', featureId as string);
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
    const dirName = basename(projectPath);
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

    projectsManifest = {
      projects: [...projectsManifest.projects, { projectId: idResult.value as string, path: projectPath }],
    };
    await saveProjectsManifest(manifestPath, projectsManifest);

    subscriptionServer?.notifyProjectListChange();
    const features = featuresCache.get(idResult.value) ?? [];

    return ok(deriveProjectSummary(idResult.value, addResult.value.state, features));
  };

  const removeProject = async (projectId: ProjectId): Promise<Result<void, RemoveProjectError>> => {
    const removeResult = await registry.remove(projectId);
    if (!removeResult.ok) {
      return err({ type: 'not_found', projectId });
    }

    pathMap.delete(projectId);
    featuresCache.delete(projectId);
    manifestIds.delete(projectId);

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
  });
  const httpServer: HttpServer = createHttpServer(httpApp, config.httpPort);

  // Ready: load manifest, initial discovery, servers listening
  const ready = (async () => {
    await Promise.all([subscriptionServer!.ready, httpServer.ready]);

    // Load projects manifest and register persisted projects
    projectsManifest = await loadProjectsManifest(manifestPath);
    for (const reg of projectsManifest.projects) {
      const idResult = createProjectId(reg.projectId);
      if (idResult.ok) {
        manifestIds.add(idResult.value);
        pathMap.set(idResult.value, reg.path);
        registry.add(toConfigFromPath(idResult.value, reg.path));
      }
    }

    // Persist deduplicated manifest
    await saveProjectsManifest(manifestPath, projectsManifest);

    await discovery.poll();
    discovery.start();

    // Populate features cache for all registered projects
    await Promise.all(registry.list().map(refreshFeatures));
  })();

  const close = async (): Promise<void> => {
    discovery.stop();
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

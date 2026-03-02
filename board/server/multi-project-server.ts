import { readFileSync } from 'node:fs';
import { readFile as readFileAsync, writeFile as writeFileAsync, access as fsAccess } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { ProjectId, ProjectConfig, ProjectSummary, FeatureSummary, AddProjectError, RemoveProjectError, Result } from '../shared/types.js';
import { createProjectId, deriveProjectSummary } from '../shared/types.js';
import { parseStateYaml, parsePlanYaml } from './parser.js';
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
} from './index.js';
import {
  createProjectDiscovery,
  scanProjectDirsFs,
  type ProjectDiscovery,
  type RegistryActions,
} from './discovery.js';
import { scanDocsDir } from './doc-tree.js';
import { readDocContent } from './doc-content.js';
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

const loadProjectsManifest = async (filePath: string): Promise<ProjectsManifest> => {
  try {
    const raw = await readFileAsync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.projects)) {
      return data as ProjectsManifest;
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

// --- Wiring: composition root ---

export const createMultiProjectServer = (
  config: MultiProjectServerConfig,
): MultiProjectServer => {
  const readFile = (path: string) => {
    try {
      return ok(readFileSync(path, 'utf-8'));
    } catch {
      return err(`Failed to read: ${path}`);
    }
  };

  const toConfig = (projectId: ProjectId): ProjectConfig => ({
    projectId,
    projectPath: join(config.projectsRoot, projectId as string),
    statePath: join(config.projectsRoot, projectId as string, 'state.yaml'),
    planPath: join(config.projectsRoot, projectId as string, 'plan.yaml'),
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
    readFile,
    parseState: parseStateYaml,
    parsePlan: parsePlanYaml,
    onStateChange: (projectId, previousState, newState) => {
      if (!subscriptionServer) return;
      const transitions = computeTransitions(previousState, newState, new Date().toISOString());
      subscriptionServer.notifyProjectUpdate(projectId, newState, transitions);
    },
  });

  // Discovery → Registry bridge
  const registryActions: RegistryActions = {
    add: (projectId: ProjectId) => {
      pathMap.set(projectId, join(config.projectsRoot, projectId as string));
      registry.add(toConfig(projectId));
      refreshFeatures(projectId).then(() => subscriptionServer?.notifyProjectListChange());
    },
    remove: (projectId: ProjectId) => {
      pathMap.delete(projectId);
      featuresCache.delete(projectId);
      registry.remove(projectId);
      subscriptionServer?.notifyProjectListChange();
    },
    knownIds: () => new Set(registry.list()),
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
      const result = registry.get(projectId);
      if (!result.ok) return undefined;
      return join(config.projectsRoot, projectId as string, 'docs');
    },
    scanDocsDir,
    readDocContent,
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

    try {
      await fsAccess(join(projectPath, 'state.yaml'));
    } catch {
      return err({ type: 'invalid_path', message: `No state.yaml found at ${projectPath}` });
    }

    pathMap.set(idResult.value, projectPath);
    const projectConfig = toConfigFromPath(idResult.value, projectPath);
    const addResult = registry.add(projectConfig);
    if (!addResult.ok) {
      pathMap.delete(idResult.value);
      if (addResult.error.type === 'project_exists') {
        return err({ type: 'duplicate', projectId: idResult.value });
      }
      if (addResult.error.type === 'load_failed') {
        return err({ type: 'invalid_path', message: addResult.error.message });
      }
      return err({ type: 'registration_failed', message: 'Failed to register project' });
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
    addProject,
    removeProject,
    discoverFeatures,
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
        pathMap.set(idResult.value, reg.path);
        registry.add(toConfigFromPath(idResult.value, reg.path));
      }
    }

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

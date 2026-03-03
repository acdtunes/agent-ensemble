import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectId } from '../shared/types.js';
import { createProjectId } from '../shared/types.js';

// --- Types ---

export interface DiscoveryDiff {
  readonly added: readonly ProjectId[];
  readonly removed: readonly ProjectId[];
}

// --- Ports ---

export type ScanProjectDirs = (rootPath: string) => Promise<readonly ProjectId[]>;

export interface RegistryActions {
  readonly add: (projectId: ProjectId) => void;
  readonly remove: (projectId: ProjectId) => void;
  readonly knownIds: () => ReadonlySet<ProjectId>;
}

// --- Pure Core ---

export const computeDiscoveryDiff = (
  knownIds: ReadonlySet<ProjectId>,
  foundIds: ReadonlySet<ProjectId>,
): DiscoveryDiff => ({
  added: [...foundIds].filter((id) => !knownIds.has(id)),
  removed: [...knownIds].filter((id) => !foundIds.has(id)),
});

// --- FS Adapter ---

const hasRoadmapYaml = async (dirPath: string): Promise<boolean> => {
  try {
    await access(join(dirPath, 'roadmap.yaml'));
    return true;
  } catch {
    return false;
  }
};

export const scanProjectDirsFs: ScanProjectDirs = async (rootPath) => {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const projectIds: ProjectId[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = join(rootPath, entry.name);
    if (await hasRoadmapYaml(dirPath)) {
      const result = createProjectId(entry.name);
      if (result.ok) projectIds.push(result.value);
    }
  }

  return projectIds;
};

// --- Controller ---

export interface ProjectDiscovery {
  readonly poll: () => Promise<DiscoveryDiff>;
  readonly start: () => void;
  readonly stop: () => void;
}

export const createProjectDiscovery = (
  rootPath: string,
  registry: RegistryActions,
  scanDirs: ScanProjectDirs,
  pollIntervalMs: number,
): ProjectDiscovery => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const poll = async (): Promise<DiscoveryDiff> => {
    const foundIds = await scanDirs(rootPath);
    const foundSet = new Set(foundIds);
    const diff = computeDiscoveryDiff(registry.knownIds(), foundSet);

    for (const id of diff.added) registry.add(id);
    for (const id of diff.removed) registry.remove(id);

    return diff;
  };

  const start = (): void => {
    if (timer !== null) return;
    timer = setInterval(() => { poll().catch(() => {}); }, pollIntervalMs);
  };

  const stop = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return { poll, start, stop };
};

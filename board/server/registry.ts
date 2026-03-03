import type {
  ProjectId,
  ProjectEntry,
  ProjectConfig,
  DeliveryState,
  ExecutionPlan,
  Roadmap,
  ParseError,
  Result,
} from '../shared/types.js';
import { ok, err } from '../shared/types.js';
import type { FileWatcher, OnChangeCallback } from './watcher.js';

// --- Registry error types ---

export type RegistryError =
  | { readonly type: 'project_exists'; readonly projectId: ProjectId }
  | { readonly type: 'project_not_found'; readonly projectId: ProjectId }
  | { readonly type: 'load_failed'; readonly message: string };

// --- Dependency ports ---

export interface RegistryDeps {
  readonly createWatcher: (filePath: string, onChange: OnChangeCallback) => FileWatcher;
  readonly readFile: (path: string) => Result<string, string>;
  readonly parseRoadmap: (content: string) => Result<Roadmap, ParseError>;
  readonly roadmapToDeliveryState: (roadmap: Roadmap) => DeliveryState;
  readonly roadmapToExecutionPlan: (roadmap: Roadmap) => ExecutionPlan;
  readonly onStateChange: (projectId: ProjectId, previousState: DeliveryState, newState: DeliveryState) => void;
  readonly onParseError?: (projectId: ProjectId, error: string) => void;
}

// --- Registry interface ---

export interface ProjectRegistry {
  readonly add: (config: ProjectConfig) => Result<ProjectEntry, RegistryError>;
  readonly remove: (projectId: ProjectId) => Promise<Result<void, RegistryError>>;
  readonly get: (projectId: ProjectId) => Result<ProjectEntry, RegistryError>;
  readonly getAll: () => readonly ProjectEntry[];
  readonly list: () => readonly ProjectId[];
  readonly close: () => Promise<void>;
}

// --- Internal entry ---

interface InternalEntry {
  readonly config: ProjectConfig;
  readonly watcher: FileWatcher | null;
  roadmap: Roadmap;
}

const EMPTY_ROADMAP: Roadmap = {
  roadmap: {},
  phases: [],
};

// --- Pure helpers ---

const loadAndParse = (
  readFile: RegistryDeps['readFile'],
  parse: RegistryDeps['parseRoadmap'],
  path: string,
): Result<Roadmap, RegistryError> => {
  const fileResult = readFile(path);
  if (!fileResult.ok) return err({ type: 'load_failed', message: fileResult.error });

  const parseResult = parse(fileResult.value);
  if (!parseResult.ok) return err({ type: 'load_failed', message: parseResult.error.message });

  return ok(parseResult.value);
};

// --- Factory ---

export const createProjectRegistry = (deps: RegistryDeps): ProjectRegistry => {
  const entries = new Map<ProjectId, InternalEntry>();

  const toProjectEntry = (entry: InternalEntry): ProjectEntry => ({
    projectId: entry.config.projectId,
    state: deps.roadmapToDeliveryState(entry.roadmap),
    plan: deps.roadmapToExecutionPlan(entry.roadmap),
  });

  const add = (config: ProjectConfig): Result<ProjectEntry, RegistryError> => {
    if (entries.has(config.projectId)) {
      return err({ type: 'project_exists', projectId: config.projectId });
    }

    const roadmapPath = config.roadmapPath ?? config.statePath;
    const roadmapResult = loadAndParse(deps.readFile, deps.parseRoadmap, roadmapPath);
    const hasRoadmap = roadmapResult.ok;

    const onChange: OnChangeCallback = (content) => {
      const parsed = deps.parseRoadmap(content);
      if (!parsed.ok) {
        deps.onParseError?.(config.projectId, parsed.error.message);
        return;
      }

      const entry = entries.get(config.projectId);
      if (!entry) return;

      const previousState = deps.roadmapToDeliveryState(entry.roadmap);
      entry.roadmap = parsed.value;
      const newState = deps.roadmapToDeliveryState(parsed.value);
      deps.onStateChange(config.projectId, previousState, newState);
    };

    const watcher = hasRoadmap ? deps.createWatcher(roadmapPath, onChange) : null;

    const entry: InternalEntry = {
      config,
      watcher,
      roadmap: roadmapResult.ok ? roadmapResult.value : EMPTY_ROADMAP,
    };

    entries.set(config.projectId, entry);
    return ok(toProjectEntry(entry));
  };

  const remove = async (projectId: ProjectId): Promise<Result<void, RegistryError>> => {
    const entry = entries.get(projectId);
    if (!entry) return err({ type: 'project_not_found', projectId });

    if (entry.watcher) await entry.watcher.close();
    entries.delete(projectId);
    return ok(undefined as void);
  };

  const get = (projectId: ProjectId): Result<ProjectEntry, RegistryError> => {
    const entry = entries.get(projectId);
    if (!entry) return err({ type: 'project_not_found', projectId });
    return ok(toProjectEntry(entry));
  };

  const getAll = (): readonly ProjectEntry[] =>
    [...entries.values()].map(toProjectEntry);

  const list = (): readonly ProjectId[] =>
    [...entries.keys()];

  const close = async (): Promise<void> => {
    const closePromises = [...entries.values()]
      .filter((entry) => entry.watcher !== null)
      .map((entry) => entry.watcher!.close());
    await Promise.all(closePromises);
  };

  return { add, remove, get, getAll, list, close };
};

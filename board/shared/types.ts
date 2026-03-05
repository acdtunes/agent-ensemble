// --- Result type for railway-oriented error handling ---

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// --- Step Status (exhaustive union — no other values possible) ---

export const STEP_STATUSES = [
  'pending',
  'claimed',
  'in_progress',
  'review',
  'approved',
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

// --- Review history ---

export type ReviewOutcome = 'approved' | 'rejected';

export interface ReviewEntry {
  readonly cycle: number;
  readonly timestamp: string;
  readonly outcome: ReviewOutcome;
  readonly feedback: string;
}

// --- Unified Roadmap types ---

export interface RoadmapStep {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly files_to_modify: readonly string[];
  readonly dependencies: readonly string[];
  readonly criteria: readonly string[];
  readonly status: StepStatus;
  readonly teammate_id: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly review_attempts: number;
  readonly review_history?: readonly ReviewEntry[];
  readonly worktree?: string;
  readonly conflicts_with?: readonly string[];
}

export interface RoadmapPhase {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly RoadmapStep[];
}

export interface RoadmapMeta {
  readonly project_id?: string;
  readonly created_at?: string;
  readonly total_steps?: number;
  readonly phases?: number;
  readonly status?: string;
  readonly reviewer?: string;
  readonly approved_at?: string;
  readonly short_description?: string;
  readonly description?: string;
}

export interface Roadmap {
  readonly roadmap: RoadmapMeta;
  readonly phases: readonly RoadmapPhase[];
}

export interface RoadmapSummary {
  readonly total_steps: number;
  readonly total_phases: number;
  readonly done: number;
  readonly in_progress: number;
  readonly pending: number;
}

// --- Computed summary (pure, never stored) ---

const IN_PROGRESS_STATUSES: ReadonlySet<StepStatus> = new Set(['claimed', 'in_progress', 'review']);

export const computeRoadmapSummary = (roadmap: Roadmap): RoadmapSummary => {
  const allSteps = roadmap.phases.flatMap((p) => p.steps);
  const done = allSteps.filter((s) => s.status === 'approved').length;
  const in_progress = allSteps.filter((s) => IN_PROGRESS_STATUSES.has(s.status)).length;

  return {
    total_steps: allSteps.length,
    total_phases: roadmap.phases.length,
    done,
    in_progress,
    pending: allSteps.length - done - in_progress,
  };
};

// --- Roadmap transitions ---

/** Roadmap-native transition — computed directly from Roadmap snapshots. */
export interface RoadmapTransition {
  readonly step_id: string;
  readonly from_status: StepStatus;
  readonly to_status: StepStatus;
  readonly teammate_id: string | null;
  readonly timestamp: string;
}

// --- Parser error types ---

export type RoadmapFormat = 'yaml' | 'json';

export type ParseError =
  | { readonly type: 'invalid_yaml'; readonly message: string }
  | { readonly type: 'invalid_json'; readonly message: string }
  | { readonly type: 'invalid_schema'; readonly message: string };

// --- Branded slug IDs ---

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createSlugId = <T extends string>(raw: string, label: string): Result<T, string> =>
  SLUG_PATTERN.test(raw)
    ? ok(raw as T)
    : err(`Invalid ${label}: '${raw}'. Must be a lowercase slug (a-z, 0-9, hyphens, no leading/trailing hyphens).`);

export type ProjectId = string & { readonly __brand: 'ProjectId' };

export const createProjectId = (raw: string): Result<ProjectId, string> =>
  createSlugId<ProjectId>(raw, 'project ID');

export type FeatureId = string & { readonly __brand: 'FeatureId' };

export const createFeatureId = (raw: string): Result<FeatureId, string> =>
  createSlugId<FeatureId>(raw, 'feature ID');

export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly shortDescription?: string;
  readonly description?: string;
}

export interface ManifestEntry {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly roadmapPath: string;
  readonly executionLogPath: string;
  readonly docsRoot: string;
}

export interface ProjectManifest {
  readonly projectId: ProjectId;
  readonly features: readonly ManifestEntry[];
}

export interface ProjectSummary {
  readonly projectId: ProjectId;
  readonly name: string;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly featureCount: number;
  readonly features: readonly FeatureSummary[];
}

const latestRoadmapTimestamp = (roadmap: Roadmap): string => {
  const timestamps = roadmap.phases
    .flatMap((p) => p.steps)
    .flatMap((s) => [s.started_at, s.completed_at])
    .filter((t): t is string => t !== null);
  return timestamps.length > 0 ? timestamps.sort().at(-1)! : '';
};

const countCompletedPhases = (roadmap: Roadmap): number =>
  roadmap.phases.filter((phase) =>
    phase.steps.length > 0 && phase.steps.every((step) => step.status === 'approved'),
  ).length;

export const deriveProjectSummary = (
  projectId: ProjectId,
  roadmap: Roadmap,
  features: readonly FeatureSummary[] = [],
): ProjectSummary => {
  const projectSummary = computeRoadmapSummary(roadmap);
  const hasProjectRoadmap = projectSummary.total_steps > 0;

  // If project has its own roadmap, use it; otherwise aggregate from features
  if (hasProjectRoadmap) {
    return {
      projectId,
      name: projectId as string,
      totalSteps: projectSummary.total_steps,
      done: projectSummary.done,
      inProgress: projectSummary.in_progress,
      currentLayer: countCompletedPhases(roadmap),
      updatedAt: latestRoadmapTimestamp(roadmap),
      featureCount: features.length,
      features,
    };
  }

  // Aggregate from features
  const totalSteps = features.reduce((sum, f) => sum + f.totalSteps, 0);
  const done = features.reduce((sum, f) => sum + f.done, 0);
  const inProgress = features.reduce((sum, f) => sum + f.inProgress, 0);
  const completedFeatures = features.filter((f) => f.totalSteps > 0 && f.done === f.totalSteps).length;
  const latestUpdate = features
    .map((f) => f.updatedAt)
    .filter((t) => t !== '')
    .sort()
    .at(-1) ?? '';

  return {
    projectId,
    name: projectId as string,
    totalSteps,
    done,
    inProgress,
    currentLayer: completedFeatures,
    updatedAt: latestUpdate,
    featureCount: features.length,
    features,
  };
};

export interface ProjectEntry {
  readonly projectId: ProjectId;
  readonly roadmap: Roadmap;
}

export interface ProjectConfig {
  readonly projectId: ProjectId;
  readonly projectPath: string;
  readonly statePath: string;
  readonly planPath: string;
  readonly roadmapPath?: string;
  readonly docsRoot?: string;
}

// --- Multi-project WebSocket protocol ---

export type ClientWSMessage =
  | { readonly type: 'subscribe'; readonly projectId: ProjectId; readonly featureId?: FeatureId }
  | { readonly type: 'unsubscribe'; readonly projectId: ProjectId; readonly featureId?: FeatureId };

// --- Doc-viewer domain types ---

export type DocNode =
  | { readonly type: 'file'; readonly name: string; readonly path: string }
  | { readonly type: 'directory'; readonly name: string; readonly path: string; readonly children: readonly DocNode[] };

export interface DocTree {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}

/** Multi-root doc tree: docs from multiple directories merged with labels */
export interface LabeledDocTree {
  readonly label: string;
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}

export interface MultiRootDocTree {
  readonly roots: readonly LabeledDocTree[];
  readonly totalFileCount: number;
}

export interface DirEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
}

// --- Manifest error types ---

export type ManifestError =
  | { readonly type: 'invalid_manifest'; readonly message: string }
  | { readonly type: 'duplicate_entry'; readonly featureId: FeatureId }
  | { readonly type: 'entry_not_found'; readonly featureId: FeatureId }
  | { readonly type: 'io_error'; readonly message: string };

// --- Doc-viewer error types ---

export type DocTreeError =
  | { readonly type: 'not_found'; readonly path: string }
  | { readonly type: 'scan_failed'; readonly message: string };

export type DocContentError =
  | { readonly type: 'not_found'; readonly path: string }
  | { readonly type: 'invalid_path'; readonly message: string }
  | { readonly type: 'read_failed'; readonly message: string };

// --- Feature archive types ---

export interface ArchivedFeature {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly archivedAt: string;
}

export type ArchiveError =
  | { readonly type: 'feature_not_found'; readonly featureId: FeatureId }
  | { readonly type: 'already_archived'; readonly featureId: FeatureId }
  | { readonly type: 'invalid_feature_id'; readonly message: string }
  | { readonly type: 'io_error'; readonly message: string };

export type RestoreError =
  | { readonly type: 'feature_not_found'; readonly featureId: FeatureId }
  | { readonly type: 'already_exists'; readonly featureId: FeatureId }
  | { readonly type: 'invalid_feature_id'; readonly message: string }
  | { readonly type: 'io_error'; readonly message: string };

// --- Project management error types ---

export type AddProjectError =
  | { readonly type: 'invalid_path'; readonly message: string }
  | { readonly type: 'duplicate'; readonly projectId: ProjectId }
  | { readonly type: 'registration_failed'; readonly message: string };

export type RemoveProjectError =
  | { readonly type: 'not_found'; readonly projectId: ProjectId }
  | { readonly type: 'removal_failed'; readonly message: string };

// --- Directory browser types ---

export interface BrowseEntry {
  readonly name: string;
  readonly path: string;
}

export type BrowseError =
  | { readonly type: 'invalid_path'; readonly message: string }
  | { readonly type: 'not_found'; readonly path: string }
  | { readonly type: 'permission_denied'; readonly path: string }
  | { readonly type: 'read_failed'; readonly message: string };

export interface BrowseResponse {
  readonly path: string;
  readonly parent: string | null;
  readonly entries: readonly BrowseEntry[];
}

export type ServerWSMessage =
  | { readonly type: 'init'; readonly projectId: ProjectId; readonly roadmap: Roadmap; readonly featureId?: FeatureId }
  | { readonly type: 'update'; readonly projectId: ProjectId; readonly roadmap: Roadmap; readonly roadmapTransitions: readonly RoadmapTransition[]; readonly featureId?: FeatureId }
  | { readonly type: 'project_list'; readonly projects: readonly ProjectSummary[] }
  | { readonly type: 'project_removed'; readonly projectId: ProjectId }
  | { readonly type: 'parse_error'; readonly projectId: ProjectId; readonly error: string; readonly featureId?: FeatureId };

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
  'failed',
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

// --- State YAML schema types ---

export interface StateSummary {
  readonly total_steps: number;
  readonly total_layers: number;
  readonly completed: number;
  readonly failed: number;
  readonly in_progress: number;
}

export interface StepState {
  readonly step_id: string;
  readonly name: string;
  readonly layer: number;
  readonly status: StepStatus;
  readonly teammate_id: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly review_attempts: number;
  readonly files_to_modify: readonly string[];
  readonly worktree?: boolean;
}

export interface TeammateState {
  readonly teammate_id: string;
  readonly current_step: string | null;
  readonly completed_steps: readonly string[];
}

export interface DeliveryState {
  readonly schema_version: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly plan_path: string;
  readonly current_layer: number;
  readonly summary: StateSummary;
  readonly steps: Readonly<Record<string, StepState>>;
  readonly teammates: Readonly<Record<string, TeammateState>>;
}

// --- Plan YAML schema types ---

export interface PlanSummary {
  readonly total_steps: number;
  readonly total_layers: number;
  readonly max_parallelism: number;
  readonly requires_worktrees: boolean;
}

export interface PlanStep {
  readonly step_id: string;
  readonly name: string;
  readonly description?: string;
  readonly files_to_modify: readonly string[];
  readonly conflicts_with?: readonly string[];
}

export interface ExecutionLayer {
  readonly layer: number;
  readonly parallel: boolean;
  readonly use_worktrees: boolean;
  readonly steps: readonly PlanStep[];
}

export interface ExecutionPlan {
  readonly schema_version: string;
  readonly summary: PlanSummary;
  readonly layers: readonly ExecutionLayer[];
}

// --- State transitions ---

export interface StateTransition {
  readonly step_id: string;
  readonly from_status: StepStatus;
  readonly to_status: StepStatus;
  readonly teammate_id: string | null;
  readonly timestamp: string;
}

// --- WebSocket protocol ---

export type WSMessage =
  | { readonly type: 'init'; readonly state: DeliveryState; readonly plan: ExecutionPlan }
  | { readonly type: 'update'; readonly state: DeliveryState; readonly transitions: readonly StateTransition[] };

// --- Parser error types ---

export type ParseError =
  | { readonly type: 'invalid_yaml'; readonly message: string }
  | { readonly type: 'invalid_schema'; readonly message: string };

// --- Multi-project types ---

export type ProjectId = string & { readonly __brand: 'ProjectId' };

const PROJECT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const createProjectId = (raw: string): Result<ProjectId, string> =>
  PROJECT_ID_PATTERN.test(raw)
    ? ok(raw as ProjectId)
    : err(`Invalid project ID: '${raw}'. Must be a lowercase slug (a-z, 0-9, hyphens, no leading/trailing hyphens).`);

// --- Feature types ---

export type FeatureId = string & { readonly __brand: 'FeatureId' };

const FEATURE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const createFeatureId = (raw: string): Result<FeatureId, string> =>
  FEATURE_ID_PATTERN.test(raw)
    ? ok(raw as FeatureId)
    : err(`Invalid feature ID: '${raw}'. Must be a lowercase slug (a-z, 0-9, hyphens, no leading/trailing hyphens).`);

export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly completed: number;
  readonly failed: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
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
  readonly completed: number;
  readonly failed: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly featureCount: number;
  readonly features: readonly FeatureSummary[];
}

export const deriveProjectSummary = (
  projectId: ProjectId,
  state: DeliveryState,
  features: readonly FeatureSummary[] = [],
): ProjectSummary => ({
  projectId,
  name: projectId as string,
  totalSteps: state.summary.total_steps,
  completed: state.summary.completed,
  failed: state.summary.failed,
  inProgress: state.summary.in_progress,
  currentLayer: state.current_layer,
  updatedAt: state.updated_at,
  featureCount: features.length,
  features,
});

export interface ProjectEntry {
  readonly projectId: ProjectId;
  readonly state: DeliveryState;
  readonly plan: ExecutionPlan;
}

export interface ProjectConfig {
  readonly projectId: ProjectId;
  readonly projectPath: string;
  readonly statePath: string;
  readonly planPath: string;
  readonly docsRoot?: string;
}

// --- Multi-project WebSocket protocol ---

export type ClientWSMessage =
  | { readonly type: 'subscribe'; readonly projectId: ProjectId }
  | { readonly type: 'unsubscribe'; readonly projectId: ProjectId };

// --- Doc-viewer domain types ---

export type DocNode =
  | { readonly type: 'file'; readonly name: string; readonly path: string }
  | { readonly type: 'directory'; readonly name: string; readonly path: string; readonly children: readonly DocNode[] };

export interface DocTree {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
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

// --- Project management error types ---

export type AddProjectError =
  | { readonly type: 'invalid_path'; readonly message: string }
  | { readonly type: 'duplicate'; readonly projectId: ProjectId }
  | { readonly type: 'registration_failed'; readonly message: string };

export type RemoveProjectError =
  | { readonly type: 'not_found'; readonly projectId: ProjectId }
  | { readonly type: 'removal_failed'; readonly message: string };

export type ServerWSMessage =
  | { readonly type: 'init'; readonly projectId: ProjectId; readonly state: DeliveryState; readonly plan: ExecutionPlan }
  | { readonly type: 'update'; readonly projectId: ProjectId; readonly state: DeliveryState; readonly transitions: readonly StateTransition[] }
  | { readonly type: 'project_list'; readonly projects: readonly ProjectSummary[] }
  | { readonly type: 'project_removed'; readonly projectId: ProjectId }
  | { readonly type: 'parse_error'; readonly projectId: ProjectId; readonly error: string };

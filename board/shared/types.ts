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

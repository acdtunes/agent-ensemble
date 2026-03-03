/**
 * Shared test fixtures for card-redesign acceptance tests.
 *
 * These fixtures build domain objects (DeliveryState, ExecutionPlan, FileCardData)
 * from business-language descriptions. Step definitions use these to set up
 * preconditions without coupling to internal data structures.
 *
 * Driving ports exercised:
 *   - Component props: FileCard, ProgressHeader, KanbanBoard, StepDetailModal
 *   - Pure functions: computePhaseIndicator, getTeammateColor, expandStepToFileCards
 */

import type {
  DeliveryState,
  ExecutionPlan,
  ExecutionLayer,
  PlanStep,
  StepState,
  StateSummary,
  TeammateState,
} from '../../../../../shared/types';
import type { FileCardData } from '../../../../utils/statusMapping';

// --- PlanStep builders ---

export const createPlanStep = (
  overrides: Partial<PlanStep> & Pick<PlanStep, 'step_id' | 'name'>,
): PlanStep => ({
  files_to_modify: [],
  conflicts_with: [],
  ...overrides,
});

// --- StepState builders ---

export const createStepState = (
  overrides: Partial<StepState> & Pick<StepState, 'step_id' | 'name' | 'status'>,
): StepState => ({
  layer: 1,
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  files_to_modify: [],
  worktree: false,
  ...overrides,
});

// --- StateSummary builder ---

export const createSummary = (overrides?: Partial<StateSummary>): StateSummary => ({
  total_steps: 7,
  total_layers: 3,
  completed: 3,
  failed: 0,
  in_progress: 2,
  ...overrides,
});

// --- ExecutionPlan builder ---

export const createPlan = (layers: readonly ExecutionLayer[]): ExecutionPlan => ({
  schema_version: '1.0',
  summary: {
    total_steps: layers.reduce((sum, l) => sum + l.steps.length, 0),
    total_layers: layers.length,
    max_parallelism: Math.max(...layers.map(l => l.steps.length)),
    requires_worktrees: layers.some(l => l.use_worktrees),
  },
  layers,
});

export const createLayer = (
  layerNum: number,
  steps: readonly PlanStep[],
  options?: { parallel?: boolean; use_worktrees?: boolean },
): ExecutionLayer => ({
  layer: layerNum,
  parallel: options?.parallel ?? true,
  use_worktrees: options?.use_worktrees ?? false,
  steps,
});

// --- DeliveryState builder ---

export const createDeliveryState = (
  steps: Record<string, StepState>,
  overrides?: Partial<Omit<DeliveryState, 'steps'>>,
): DeliveryState => {
  const stepValues = Object.values(steps);
  const completed = stepValues.filter(s => s.status === 'approved').length;
  const failed = stepValues.filter(s => s.status === 'failed').length;
  const inProgress = stepValues.filter(s =>
    s.status === 'in_progress' || s.status === 'claimed',
  ).length;

  const teammates: Record<string, TeammateState> = {};
  for (const step of stepValues) {
    if (step.teammate_id !== null) {
      teammates[step.teammate_id] = {
        teammate_id: step.teammate_id,
        current_step: step.status === 'approved' ? null : step.step_id,
        completed_steps: step.status === 'approved' ? [step.step_id] : [],
      };
    }
  }

  return {
    schema_version: '1.0',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T01:00:00Z',
    plan_path: '.nw-teams/plan.yaml',
    current_layer: overrides?.current_layer ?? 1,
    summary: {
      total_steps: overrides?.summary?.total_steps ?? stepValues.length,
      total_layers: overrides?.summary?.total_layers ?? 1,
      completed,
      failed,
      in_progress: inProgress,
      ...overrides?.summary,
    },
    steps,
    teammates,
    ...overrides,
  };
};

// --- FileCardData builder ---

export const createFileCardData = (
  overrides: Partial<FileCardData> & Pick<FileCardData, 'filename' | 'stepId' | 'stepName'>,
): FileCardData => ({
  displayColumn: 'in_progress',
  reviewCount: 0,
  worktree: false,
  isBlocked: false,
  teammateId: null,
  ...overrides,
});


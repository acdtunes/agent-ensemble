import type {
  DeliveryState,
  ExecutionPlan,
  FeatureSummary,
  StepState,
} from '../../shared/types';

// --- Synthesize a queued DeliveryState from a plan (all steps pending) ---

export const synthesizeQueuedState = (plan: ExecutionPlan): DeliveryState => {
  const steps: Record<string, StepState> = {};

  for (const layer of plan.layers) {
    for (const planStep of layer.steps) {
      steps[planStep.step_id] = {
        step_id: planStep.step_id,
        name: planStep.name,
        layer: layer.layer,
        status: 'pending',
        teammate_id: null,
        started_at: null,
        completed_at: null,
        review_attempts: 0,
        files_to_modify: planStep.files_to_modify,
      };
    }
  }

  return {
    schema_version: plan.schema_version,
    created_at: '',
    updated_at: '',
    plan_path: '',
    current_layer: plan.layers[0]?.layer ?? 1,
    summary: {
      total_steps: plan.summary.total_steps,
      total_layers: plan.summary.total_layers,
      completed: 0,
      failed: 0,
      in_progress: 0,
    },
    steps,
    teammates: {},
  };
};

// --- Filter features to board-capable only (has roadmap) ---

export const filterBoardCapableFeatures = (
  features: readonly FeatureSummary[],
): readonly FeatureSummary[] =>
  features.filter(f => f.hasRoadmap);

// --- URL builders ---

export const buildFeatureBoardUrl = (projectId: string, featureId: string): string =>
  `#/projects/${projectId}/features/${featureId}/board`;

export const buildFeatureDocsUrl = (projectId: string, featureId: string): string =>
  `#/projects/${projectId}/features/${featureId}/docs`;

import type {
  Roadmap,
  RoadmapStep,
  RoadmapSummary,
  DeliveryState,
  ExecutionPlan,
  ExecutionLayer,
  PlanStep,
  StepState,
  TeammateState,
  StepStatus,
} from './types.js';

// --- Computed summary (pure, never stored) ---

const IN_PROGRESS_STATUSES: ReadonlySet<StepStatus> = new Set(['claimed', 'in_progress', 'review']);

export const computeRoadmapSummary = (roadmap: Roadmap): RoadmapSummary => {
  const allSteps = roadmap.phases.flatMap((p) => p.steps);
  const completed = allSteps.filter((s) => s.status === 'approved').length;
  const failed = allSteps.filter((s) => s.status === 'failed').length;
  const in_progress = allSteps.filter((s) => IN_PROGRESS_STATUSES.has(s.status)).length;

  return {
    total_steps: allSteps.length,
    total_phases: roadmap.phases.length,
    completed,
    failed,
    in_progress,
    pending: allSteps.length - completed - failed - in_progress,
  };
};

// --- Bridge functions (Roadmap -> legacy types for incremental migration) ---

const roadmapStepToPlanStep = (step: RoadmapStep): PlanStep => ({
  step_id: step.id,
  name: step.name,
  ...(step.description !== undefined ? { description: step.description } : {}),
  files_to_modify: step.files_to_modify as string[],
  conflicts_with: [],
});

export const roadmapToExecutionPlan = (roadmap: Roadmap): ExecutionPlan => {
  const layers: ExecutionLayer[] = roadmap.phases.map((phase, i) => ({
    layer: i,
    parallel: false,
    use_worktrees: false,
    steps: phase.steps.map(roadmapStepToPlanStep),
  }));

  return {
    schema_version: '1.0',
    summary: {
      total_steps: roadmap.phases.reduce((n, p) => n + p.steps.length, 0),
      total_layers: layers.length,
      max_parallelism: 1,
      requires_worktrees: false,
    },
    layers,
  };
};

const roadmapStepToStepState = (step: RoadmapStep, layerIndex: number): StepState => ({
  step_id: step.id,
  name: step.name,
  layer: layerIndex,
  status: step.status,
  teammate_id: step.teammate_id,
  started_at: step.started_at,
  completed_at: step.completed_at,
  review_attempts: step.review_attempts,
  files_to_modify: step.files_to_modify as string[],
});

export const roadmapToDeliveryState = (roadmap: Roadmap): DeliveryState => {
  const steps: Record<string, StepState> = {};
  const teammateMap = new Map<string, { current_step: string | null; completed_steps: string[] }>();

  roadmap.phases.forEach((phase, layerIndex) => {
    for (const step of phase.steps) {
      steps[step.id] = roadmapStepToStepState(step, layerIndex);

      if (step.teammate_id !== null) {
        const existing = teammateMap.get(step.teammate_id);
        if (existing) {
          if (step.status === 'approved') existing.completed_steps.push(step.id);
          else existing.current_step = step.id;
        } else {
          teammateMap.set(step.teammate_id, {
            current_step: step.status === 'approved' ? null : step.id,
            completed_steps: step.status === 'approved' ? [step.id] : [],
          });
        }
      }
    }
  });

  const teammates: Record<string, TeammateState> = {};
  for (const [id, info] of teammateMap) {
    teammates[id] = { teammate_id: id, current_step: info.current_step, completed_steps: info.completed_steps };
  }

  const summary = computeRoadmapSummary(roadmap);
  const timestamps = roadmap.phases.flatMap((p) => p.steps).flatMap((s) => [s.started_at, s.completed_at].filter(Boolean)) as string[];
  const latest = timestamps.length > 0 ? timestamps.sort().at(-1)! : '';
  const earliest = timestamps.length > 0 ? timestamps.sort()[0] : '';

  return {
    schema_version: '1.0',
    created_at: roadmap.roadmap.created_at ?? earliest,
    updated_at: latest,
    plan_path: '',
    current_layer: 0,
    summary: {
      total_steps: summary.total_steps,
      total_layers: summary.total_phases,
      completed: summary.completed,
      failed: summary.failed,
      in_progress: summary.in_progress,
    },
    steps,
    teammates,
  };
};

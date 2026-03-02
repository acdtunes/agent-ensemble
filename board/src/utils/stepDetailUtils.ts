import type { ExecutionPlan, PlanStep } from '../../shared/types';

export const buildPlanStepLookup = (plan: ExecutionPlan): ReadonlyMap<string, PlanStep> =>
  new Map(
    plan.layers.flatMap(layer => layer.steps.map(step => [step.step_id, step] as const)),
  );

export const computeDuration = (
  startedAt: string | null,
  completedAt: string | null,
): string | null => {
  if (startedAt === null || completedAt === null) return null;

  const totalMinutes = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

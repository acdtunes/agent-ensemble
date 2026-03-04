import type { Roadmap, RoadmapStep } from '../../shared/types';

export const buildPlanStepLookup = (roadmap: Roadmap): ReadonlyMap<string, RoadmapStep> =>
  new Map(
    roadmap.phases.flatMap((phase) => phase.steps.map((step) => [step.id, step] as const)),
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

import type { Roadmap, RoadmapTransition, StepStatus } from '../shared/types.js';

/**
 * Compute step transitions by comparing step statuses between
 * two successive Roadmap snapshots.
 *
 * Pure function: no side effects, no IO.
 */

interface StepSnapshot {
  readonly status: StepStatus;
  readonly teammate_id: string | null;
}

const collectStepSnapshots = (roadmap: Roadmap): ReadonlyMap<string, StepSnapshot> =>
  new Map(
    roadmap.phases.flatMap((phase) =>
      phase.steps.map((step) => [step.id, { status: step.status, teammate_id: step.teammate_id }] as const),
    ),
  );

export const computeTransitions = (
  previous: Roadmap,
  current: Roadmap,
  timestamp: string,
): readonly RoadmapTransition[] => {
  const prevSnapshots = collectStepSnapshots(previous);

  return current.phases
    .flatMap((phase) => phase.steps)
    .filter((step) => {
      const prevStatus = prevSnapshots.get(step.id)?.status ?? 'pending';
      return prevStatus !== step.status;
    })
    .map((step): RoadmapTransition => ({
      step_id: step.id,
      from_status: prevSnapshots.get(step.id)?.status ?? 'pending',
      to_status: step.status,
      teammate_id: step.teammate_id,
      timestamp,
    }));
};

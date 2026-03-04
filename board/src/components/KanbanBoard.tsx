import { useMemo } from 'react';
import type { Roadmap, RoadmapStep, RoadmapPhase } from '../../shared/types';
import { LayerLane } from './LayerLane';

export interface KanbanBoardProps {
  readonly roadmap: Roadmap;
  readonly onCardClick?: (stepId: string) => void;
}

const collectAllSteps = (roadmap: Roadmap): readonly RoadmapStep[] =>
  roadmap.phases.flatMap((phase) => phase.steps);

const computeBlockedStepIds = (
  allSteps: readonly RoadmapStep[],
): ReadonlySet<string> => {
  // For now, no steps are blocked since we don't have conflicts_with in RoadmapStep
  // In the future, we could track dependencies
  return new Set<string>();
};

export const KanbanBoard = ({ roadmap, onCardClick }: KanbanBoardProps) => {
  const allSteps = useMemo(() => collectAllSteps(roadmap), [roadmap]);
  const blockedStepIds = useMemo(
    () => computeBlockedStepIds(allSteps),
    [allSteps],
  );

  return (
    <>
      {roadmap.phases.map((phase, index) => (
        <LayerLane
          key={phase.id}
          phase={phase}
          phaseIndex={index}
          blockedStepIds={blockedStepIds}
          onCardClick={onCardClick}
        />
      ))}
    </>
  );
};

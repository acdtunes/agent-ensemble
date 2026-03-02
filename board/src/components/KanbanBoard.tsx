import { useMemo } from 'react';
import type { DeliveryState, ExecutionPlan, PlanStep, StepState } from '../../shared/types';
import { LayerLane } from './LayerLane';

interface KanbanBoardProps {
  readonly state: DeliveryState;
  readonly plan: ExecutionPlan;
  readonly onCardClick?: (stepId: string) => void;
}

const collectAllPlanSteps = (plan: ExecutionPlan): readonly PlanStep[] =>
  plan.layers.flatMap(layer => layer.steps);

const getStepStatesForLayer = (
  layer: { readonly steps: readonly PlanStep[] },
  stateSteps: Readonly<Record<string, StepState>>,
): readonly StepState[] =>
  layer.steps
    .map(planStep => stateSteps[planStep.step_id])
    .filter((stepState): stepState is StepState => stepState !== undefined);

const computeBlockedStepIds = (
  stateSteps: Readonly<Record<string, StepState>>,
  allPlanSteps: readonly PlanStep[],
): ReadonlySet<string> => {
  const activeStatuses = new Set(['claimed', 'in_progress']);
  const blocked = new Set<string>();

  for (const planStep of allPlanSteps) {
    const state = stateSteps[planStep.step_id];
    if (!state || state.status !== 'pending') continue;

    const hasActiveConflict = (planStep.conflicts_with ?? []).some(conflictId => {
      const conflictState = stateSteps[conflictId];
      return conflictState !== undefined && activeStatuses.has(conflictState.status);
    });

    if (hasActiveConflict) {
      blocked.add(planStep.step_id);
    }
  }

  return blocked;
};

export const KanbanBoard = ({ state, plan, onCardClick }: KanbanBoardProps) => {
  const allPlanSteps = useMemo(() => collectAllPlanSteps(plan), [plan]);
  const blockedStepIds = useMemo(
    () => computeBlockedStepIds(state.steps, allPlanSteps),
    [state.steps, allPlanSteps],
  );

  return (
    <>
      {plan.layers.map(layer => (
        <LayerLane
          key={layer.layer}
          layer={layer}
          stepStates={getStepStatesForLayer(layer, state.steps)}
          blockedStepIds={blockedStepIds}
          onCardClick={onCardClick}
        />
      ))}
    </>
  );
};

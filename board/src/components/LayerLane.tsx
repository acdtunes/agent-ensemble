import type { ExecutionLayer, StepState } from '../../shared/types';
import type { DisplayColumn, FileCardData } from '../utils/statusMapping';
import { DISPLAY_COLUMNS, expandStepToFileCards } from '../utils/statusMapping';
import { FileCard } from './FileCard';
import { getStatusColor, getStatusLabel } from '../utils/statusColors';

interface LayerLaneProps {
  readonly layer: ExecutionLayer;
  readonly stepStates: readonly StepState[];
  readonly blockedStepIds: ReadonlySet<string>;
  readonly onCardClick?: (stepId: string) => void;
}

const groupFileCardsByColumn = (cards: readonly FileCardData[]): Readonly<Record<DisplayColumn, readonly FileCardData[]>> => {
  const groups: Record<DisplayColumn, FileCardData[]> = {
    pending: [], in_progress: [], review: [], done: [],
  };
  for (const card of cards) {
    groups[card.displayColumn].push(card);
  }
  return groups;
};

const computeProgress = (steps: readonly StepState[]): { readonly completed: number; readonly total: number } => ({
  completed: steps.filter(step => step.status === 'approved').length,
  total: steps.length,
});

export const LayerLane = ({ layer, stepStates, blockedStepIds, onCardClick }: LayerLaneProps) => {
  const fileCards = stepStates.flatMap(step =>
    expandStepToFileCards(step, blockedStepIds.has(step.step_id)),
  );
  const grouped = groupFileCardsByColumn(fileCards);
  const progress = computeProgress(stepStates);

  return (
    <div data-testid={`layer-${layer.layer}`} className="mb-4 rounded-lg border border-gray-800 bg-gray-900/60 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-2">
        <span className="font-medium text-gray-200">Layer {layer.layer}</span>
        <span className="text-sm text-gray-400">
          {layer.steps.length} {layer.parallel ? 'parallel' : 'sequential'}
        </span>
        {layer.use_worktrees && (
          <span className="rounded-full bg-indigo-950/50 px-1.5 py-0.5 text-xs font-medium text-indigo-400">worktree</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-400">{progress.completed}/{progress.total}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-gray-800">
        {DISPLAY_COLUMNS.map(column => {
          const colors = getStatusColor(column);
          return (
            <div key={column} data-testid={`column-${column}`} className={`min-h-[80px] p-2 transition-colors duration-300 ${colors.bg}`}>
              <div className={`mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${colors.text}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${colors.border} border-2`} />
                {getStatusLabel(column)}
                <span className="ml-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs font-normal text-gray-400 shadow-sm">
                  {grouped[column].length}
                </span>
              </div>
              <div className="space-y-1">
                {grouped[column].map(card => (
                  <FileCard
                    key={`${card.stepId}-${card.filename}`}
                    card={card}
                    onCardClick={onCardClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

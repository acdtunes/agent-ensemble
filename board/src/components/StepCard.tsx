import { useState } from 'react';
import type { StepCardData } from '../utils/statusMapping';
import { getStatusTopBarColor } from '../utils/statusColors';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { useToast } from '../hooks/useToast';

const Badge = ({ bg, text, children }: { readonly bg: string; readonly text: string; readonly children: React.ReactNode }) => (
  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${bg} ${text}`}>{children}</span>
);

interface ConflictBadgeProps {
  readonly conflictsWith: readonly string[];
}

const ConflictBadge = ({ conflictsWith }: ConflictBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Badge bg="bg-amber-950/50" text="text-amber-400">
        conflicts: {conflictsWith.length}
      </Badge>
      {showTooltip && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 shadow-lg"
        >
          Conflicts with: {conflictsWith.join(', ')}
        </span>
      )}
    </span>
  );
};

const MetadataChip = ({ children }: { readonly children: React.ReactNode }) => (
  <span className="bg-gray-800 rounded-full px-2 py-0.5 text-xs text-gray-300">{children}</span>
);

interface StepCardProps {
  readonly card: StepCardData;
  readonly onCardClick?: (stepId: string) => void;
  readonly isHighlighted?: boolean;
}

export const StepCard = ({ card, onCardClick, isHighlighted = false }: StepCardProps) => {
  const animationClasses = getCardAnimationClasses(card.displayColumn);
  const topBarColor = getStatusTopBarColor(card.displayColumn);
  const isClickable = onCardClick !== undefined;
  const highlightClasses = isHighlighted ? 'ring-2 ring-amber-400' : '';
  const toast = useToast();

  const handleStepIdClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(card.stepId);
    toast.show(`Copied ${card.stepId}`);
  };

  return (
    <div
      data-testid="step-card"
      className={`overflow-hidden rounded-b min-h-[160px] mx-auto max-w-[360px] flex flex-col bg-gray-900/80 backdrop-blur-sm p-3 shadow-sm ${topBarColor} ${animationClasses}${isClickable ? ' cursor-pointer' : ''} ${highlightClasses}`}
      onClick={isClickable ? () => onCardClick(card.stepId) : undefined}
    >
      <div>
        <span className="min-w-0 text-base font-medium text-gray-100">{card.stepName}</span>
        {card.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-400">{card.description}</p>
        )}
      </div>
      {card.displayColumn !== 'done' && (
        <div className="mt-1 flex flex-wrap gap-1">
          {card.conflictsWith?.length > 0 && (
            <ConflictBadge conflictsWith={card.conflictsWith} />
          )}
          {card.usesWorktree && (
            <Badge bg="bg-indigo-950/50" text="text-indigo-400">worktree</Badge>
          )}
          {card.isBlocked && (
            <Badge bg="bg-red-950/50" text="text-red-400">blocked</Badge>
          )}
        </div>
      )}
      <div className="flex-grow" />
      <div
        data-testid="card-footer"
        className="mt-2 flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1">
          <MetadataChip>{card.fileCount} {card.fileCount === 1 ? 'file' : 'files'}</MetadataChip>
          {card.dependencyCount > 0 && (
            <MetadataChip>🔗 {card.dependencyCount} {card.dependencyCount === 1 ? 'dep' : 'deps'}</MetadataChip>
          )}
        </div>
        <span className="flex items-center gap-1">
          {toast.message && (
            <span role="status" className="text-xs text-gray-500">
              {toast.message}
            </span>
          )}
          <span
            data-testid="step-id"
            className="shrink-0 whitespace-nowrap font-mono text-xs text-gray-400 cursor-pointer hover:underline hover:text-gray-200"
            onClick={handleStepIdClick}
          >
            {card.stepId}
          </span>
        </span>
      </div>
    </div>
  );
};

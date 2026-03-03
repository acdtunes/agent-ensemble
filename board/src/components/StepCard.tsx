import type { StepCardData } from '../utils/statusMapping';
import { getStatusTopBarColor } from '../utils/statusColors';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { getTeammateColor } from '../utils/teammateColors';
import { getTeammateEmoji } from '../utils/teammateEmoji';

const Badge = ({ bg, text, children }: { readonly bg: string; readonly text: string; readonly children: React.ReactNode }) => (
  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${bg} ${text}`}>{children}</span>
);

const MetadataChip = ({ children }: { readonly children: React.ReactNode }) => (
  <span className="bg-gray-800 rounded-full px-2 py-0.5 text-xs text-gray-300">{children}</span>
);

interface StepCardProps {
  readonly card: StepCardData;
  readonly onCardClick?: (stepId: string) => void;
}

export const StepCard = ({ card, onCardClick }: StepCardProps) => {
  const animationClasses = getCardAnimationClasses(card.displayColumn);
  const topBarColor = getStatusTopBarColor(card.displayColumn);
  const isClickable = onCardClick !== undefined;
  const hasTeammate = card.teammateId !== null;

  return (
    <div
      data-testid="step-card"
      className={`rounded min-h-[160px] flex flex-col bg-gray-900/80 backdrop-blur-sm p-2 text-sm shadow-sm ${topBarColor} ${animationClasses}${isClickable ? ' cursor-pointer' : ''}`}
      onClick={isClickable ? () => onCardClick(card.stepId) : undefined}
    >
      <div className="flex items-start">
        <span className="min-w-0 font-medium text-gray-100">{card.stepName}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <MetadataChip>📁 {card.fileCount} {card.fileCount === 1 ? 'file' : 'files'}</MetadataChip>
        {card.dependencyCount > 0 && (
          <MetadataChip>🔗 {card.dependencyCount} {card.dependencyCount === 1 ? 'dep' : 'deps'}</MetadataChip>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {card.worktree && (
          <Badge bg="bg-indigo-950/50" text="text-indigo-400">worktree</Badge>
        )}
        {card.isBlocked && (
          <Badge bg="bg-red-950/50" text="text-red-400">blocked</Badge>
        )}
      </div>
      <div className="flex-grow" />
      <div
        data-testid="card-footer"
        className={`mt-2 flex items-center ${hasTeammate ? 'justify-between' : 'justify-end'}`}
      >
        {hasTeammate && (
          <span className={`text-xs font-medium ${getTeammateColor(card.teammateId!)}`}>
            {getTeammateEmoji(card.teammateId!)} {card.teammateId}
          </span>
        )}
        <span className="shrink-0 whitespace-nowrap font-mono text-xs text-gray-400">{card.stepId}</span>
      </div>
    </div>
  );
};

import type { StepCardData } from '../utils/statusMapping';
import { getStatusTopBarColor } from '../utils/statusColors';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { getTeammateColor } from '../utils/teammateColors';

const PersonIcon = () => (
  <svg className="h-3 w-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
  </svg>
);

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

  return (
    <div
      data-testid="step-card"
      className={`rounded min-h-[160px] flex flex-col bg-gray-900/80 backdrop-blur-sm p-2 text-sm shadow-sm ${topBarColor} ${animationClasses}${isClickable ? ' cursor-pointer' : ''}`}
      onClick={isClickable ? () => onCardClick(card.stepId) : undefined}
    >
      <div className="flex items-start justify-between">
        <span className="min-w-0 font-medium text-gray-100">{card.stepName}</span>
        <span className="shrink-0 whitespace-nowrap font-mono text-xs text-gray-400">{card.stepId}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <MetadataChip>📁 {card.fileCount} {card.fileCount === 1 ? 'file' : 'files'}</MetadataChip>
        {card.dependencyCount > 0 && (
          <MetadataChip>🔗 {card.dependencyCount} {card.dependencyCount === 1 ? 'dep' : 'deps'}</MetadataChip>
        )}
      </div>
      {card.teammateId !== null && (
        <div data-testid="teammate-indicator" className="mt-1 flex items-center gap-1">
          <PersonIcon />
          <span className={`text-xs font-medium ${getTeammateColor(card.teammateId)}`}>
            {card.teammateId}
          </span>
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        {card.worktree && (
          <Badge bg="bg-indigo-950/50" text="text-indigo-400">worktree</Badge>
        )}
        {card.isBlocked && (
          <Badge bg="bg-red-950/50" text="text-red-400">blocked</Badge>
        )}
      </div>
    </div>
  );
};

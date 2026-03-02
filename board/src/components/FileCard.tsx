import type { FileCardData } from '../utils/statusMapping';
import { getStatusColor } from '../utils/statusColors';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { getTeammateColor } from '../utils/teammateColors';

const PersonIcon = () => (
  <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
  </svg>
);

const Badge = ({ bg, text, children }: { readonly bg: string; readonly text: string; readonly children: React.ReactNode }) => (
  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${bg} ${text}`}>{children}</span>
);

interface FileCardProps {
  readonly card: FileCardData;
  readonly onCardClick?: (stepId: string) => void;
}

export const FileCard = ({ card, onCardClick }: FileCardProps) => {
  const colors = getStatusColor(card.displayColumn);
  const animationClasses = getCardAnimationClasses(card.displayColumn);
  const isClickable = onCardClick !== undefined;

  return (
    <div
      data-testid="file-card"
      className={`rounded border-l-2 bg-white p-2 text-sm shadow-sm ${colors.border} ${animationClasses}${isClickable ? ' cursor-pointer' : ''}`}
      onClick={isClickable ? () => onCardClick(card.stepId) : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">{card.stepName}</span>
        <span className="font-mono text-xs text-gray-400">{card.stepId}</span>
      </div>
      <div className="text-xs text-gray-500">
        {card.filename}
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
          <Badge bg="bg-indigo-50" text="text-indigo-600">worktree</Badge>
        )}
        {card.retryCount > 0 && (
          <Badge bg="bg-orange-50" text="text-orange-600">{card.retryCount} retries</Badge>
        )}
        {card.isBlocked && (
          <Badge bg="bg-red-50" text="text-red-600">blocked</Badge>
        )}
      </div>
    </div>
  );
};

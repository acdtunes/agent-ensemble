import type { FeatureSummary } from '../../shared/types';
import { computeCompletionPercentage } from './ProjectCard';

// --- Pure functions ---

export type FeatureDisplayState = 'completed' | 'active' | 'planned' | 'docs-only';

export const classifyFeatureDisplayState = (feature: FeatureSummary): FeatureDisplayState => {
  if (!feature.hasRoadmap) return 'docs-only';
  if (feature.totalSteps > 0 && feature.completed === feature.totalSteps) return 'completed';
  if (feature.inProgress > 0 || feature.completed > 0 || feature.failed > 0) return 'active';
  return 'planned';
};

export const formatProgressLabel = (completed: number, total: number): string =>
  `${completed} of ${total}`;

// --- Component ---

interface FeatureCardProps {
  readonly feature: FeatureSummary;
  readonly onBoardClick?: () => void;
  readonly onDocsClick?: () => void;
}

const STATE_LABELS: Record<FeatureDisplayState, string> = {
  'completed': 'Completed',
  'active': 'Active',
  'planned': 'Planned',
  'docs-only': 'Docs only',
};

export const FeatureCard = ({ feature, onBoardClick, onDocsClick }: FeatureCardProps) => {
  const displayState = classifyFeatureDisplayState(feature);
  const percentage = computeCompletionPercentage(feature.completed, feature.totalSteps);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100">{feature.name}</h3>
        <span className="text-xs font-medium text-gray-400">{STATE_LABELS[displayState]}</span>
      </div>

      {displayState !== 'docs-only' && (
        <>
          <div className="mt-2 text-sm text-gray-300">
            {formatProgressLabel(feature.completed, feature.totalSteps)}
          </div>

          <div
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1 h-1.5 w-full rounded-full bg-gray-700"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {feature.inProgress > 0 && (
              <span className="rounded-full bg-blue-950/50 px-1.5 py-0.5 font-medium text-blue-400">
                {feature.inProgress} in progress
              </span>
            )}
            {feature.failed > 0 && (
              <span className="rounded-full bg-red-950/50 px-1.5 py-0.5 font-medium text-red-400">
                {feature.failed} failed
              </span>
            )}
          </div>
        </>
      )}

      <div className="mt-3 flex gap-2">
        {feature.hasRoadmap && onBoardClick && (
          <button
            onClick={onBoardClick}
            className="rounded bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-700"
          >
            Board
          </button>
        )}
        {onDocsClick && (
          <button
            onClick={onDocsClick}
            className="rounded bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-700"
          >
            Docs
          </button>
        )}
      </div>
    </div>
  );
};

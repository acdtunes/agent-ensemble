import type { FeatureSummary } from "../../shared/types";
import { computeCompletionPercentage } from "./ProjectCard";

// --- Pure functions ---

export type FeatureDisplayState = "completed" | "active" | "planned";

export const classifyFeatureDisplayState = (
  feature: FeatureSummary,
): FeatureDisplayState | null => {
  if (!feature.hasRoadmap) return null;
  if (feature.totalSteps > 0 && feature.done === feature.totalSteps) return 'completed';
  if (feature.inProgress > 0 || feature.done > 0) return 'active';
  return 'planned';
};

export const formatProgressLabel = (done: number, total: number): string =>
  `${done} of ${total}`;

// --- Component ---

interface FeatureCardProps {
  readonly feature: FeatureSummary;
  readonly onClick?: () => void;
}

const STATE_LABELS: Record<FeatureDisplayState, string> = {
  completed: "Completed",
  active: "Active",
  planned: "Planned",
};

export const FeatureCard = ({ feature, onClick }: FeatureCardProps) => {
  const displayState = classifyFeatureDisplayState(feature);
  const percentage = computeCompletionPercentage(feature.done, feature.totalSteps);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="cursor-pointer rounded-lg border border-gray-800 bg-gray-900/80 p-3 shadow-sm transition-colors hover:border-gray-600 hover:bg-gray-900"
    >
      <div className="flex items-center justify-between">
        <h3 className="truncate text-sm font-semibold text-gray-100">
          {feature.name}
        </h3>
        {displayState !== null && (
          <span className="text-xs font-medium text-gray-400">
            {STATE_LABELS[displayState]}
          </span>
        )}
      </div>

      {displayState !== null && (
        <>
          <div className="mt-1.5 text-sm text-gray-300">
            {formatProgressLabel(feature.done, feature.totalSteps)}
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

          {feature.inProgress > 0 && (
            <div className="mt-1.5 text-xs">
              <span className="whitespace-nowrap rounded-full bg-blue-950/50 px-1.5 py-0.5 font-medium text-blue-400">
                {feature.inProgress} in progress
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

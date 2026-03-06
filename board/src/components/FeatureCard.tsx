import { useState } from "react";
import type { FeatureSummary } from "../../shared/types";
import { computeCompletionPercentage } from "./ProjectCard";
import { ArchiveConfirmDialog } from "./ArchiveConfirmDialog";
import { useArchiveFeature } from "../hooks/useArchiveFeature";
import { useToast } from "../hooks/useToast";

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

/** Pure function: check if description is non-empty (not undefined, empty, or whitespace-only) */
export const hasValidDescription = (description: string | undefined): boolean =>
  description !== undefined && description.trim().length > 0;

// --- Component ---

interface FeatureCardProps {
  readonly feature: FeatureSummary;
  readonly onClick?: () => void;
  readonly projectId?: string;
  readonly onArchiveSuccess?: () => void;
}

const STATE_LABELS: Record<FeatureDisplayState, string> = {
  completed: "Completed",
  active: "Active",
  planned: "Planned",
};

export const FeatureCard = ({
  feature,
  onClick,
  projectId,
  onArchiveSuccess,
}: FeatureCardProps) => {
  const displayState = classifyFeatureDisplayState(feature);
  const percentage = computeCompletionPercentage(feature.done, feature.totalSteps);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { archiving, archiveFeature } = useArchiveFeature();
  const toast = useToast();

  const showArchiveButton = projectId !== undefined;

  const handleFeatureIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(feature.featureId);
    toast.show(`Copied ${feature.featureId}`);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!projectId) return;
    const result = await archiveFeature(projectId, feature.featureId);
    if (result.ok) {
      setIsDialogOpen(false);
      onArchiveSuccess?.();
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
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
          <div className="min-w-0 flex-1">
            {hasValidDescription(feature.shortDescription) && (
              <p
                data-testid="feature-description"
                className="truncate text-xs text-gray-400"
              >
                {feature.shortDescription}
              </p>
            )}
            {hasValidDescription(feature.description) && (
              <p
                data-testid="feature-full-description"
                className="line-clamp-2 text-xs text-gray-500"
              >
                {feature.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <h3
                data-testid="feature-id"
                onClick={handleFeatureIdClick}
                className="truncate text-sm font-semibold text-gray-100 cursor-pointer hover:underline"
              >
                {feature.name}
              </h3>
              {toast.message && (
                <span role="status" className="text-xs text-gray-400">
                  {toast.message}
                </span>
              )}
            </div>
          </div>
          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
            {displayState !== null && (
              <span className="text-xs font-medium text-gray-400">
                {STATE_LABELS[displayState]}
              </span>
            )}
            {showArchiveButton && (
              <button
                type="button"
                onClick={handleArchiveClick}
                className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-amber-400"
                aria-label="Archive"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
                  <path
                    fillRule="evenodd"
                    d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
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

      <ArchiveConfirmDialog
        featureName={feature.name}
        isOpen={isDialogOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={archiving}
      />
    </>
  );
};

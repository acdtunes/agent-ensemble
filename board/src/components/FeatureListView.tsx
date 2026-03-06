import type { FeatureGroup } from "../utils/featureGrouping";
import type { FeatureSummary } from "../../shared/types";
import {
  classifyFeatureDisplayState,
  formatProgressLabel,
  type FeatureDisplayState,
} from "./FeatureCard";

// --- Types ---

interface FeatureListViewProps {
  readonly groups: readonly FeatureGroup[];
  readonly projectId: string;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
  readonly onArchiveSuccess?: () => void;
}

// --- Pure functions ---

const hasShortDescription = (feature: FeatureSummary): boolean =>
  feature.shortDescription !== undefined &&
  feature.shortDescription.trim() !== "";

const STATE_LABELS: Record<FeatureDisplayState, string> = {
  completed: "Completed",
  active: "Active",
  planned: "Planned",
};

const getStatusLabel = (feature: FeatureSummary): string => {
  const state = classifyFeatureDisplayState(feature);
  return state === null ? "No Roadmap" : STATE_LABELS[state];
};

const getProgressLabel = (feature: FeatureSummary): string =>
  feature.hasRoadmap
    ? formatProgressLabel(feature.done, feature.totalSteps)
    : "-";

// --- Component ---

export const FeatureListView = ({
  groups,
  projectId,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
}: FeatureListViewProps) => (
  <div data-testid="feature-list-view" className="space-y-4">
    {groups.map((group) => (
      <div key={group.key}>
        <h2 className="mb-2 text-sm font-semibold text-gray-400 col-span-full">
          {group.displayName} ({group.features.length})
        </h2>
        <div className="space-y-1">
          {group.features.map((feature) => (
            <FeatureRow
              key={feature.featureId}
              feature={feature}
              onClick={() =>
                feature.hasRoadmap
                  ? onNavigateFeatureBoard(feature.featureId)
                  : onNavigateFeatureDocs(feature.featureId)
              }
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// --- Internal component ---

interface FeatureRowProps {
  readonly feature: FeatureSummary;
  readonly onClick: () => void;
}

const FeatureRow = ({ feature, onClick }: FeatureRowProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") onClick();
    }}
    className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2 transition-colors hover:border-gray-600 hover:bg-gray-900"
  >
    <div className="flex-1 truncate">
      {hasShortDescription(feature) ? (
        <>
          <span className="font-medium text-gray-100">
            {feature.shortDescription}
          </span>
          <span className="ml-2 text-xs text-gray-500">{feature.name}</span>
        </>
      ) : (
        <span className="font-medium text-gray-100">{feature.name}</span>
      )}
    </div>
    <span className="w-24 text-sm text-gray-400">
      {getStatusLabel(feature)}
    </span>
    <span className="w-16 text-right text-sm text-gray-400">
      {getProgressLabel(feature)}
    </span>
  </div>
);

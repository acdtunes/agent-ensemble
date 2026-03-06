import { useState } from "react";
import type { FeatureSummary, ArchivedFeature } from "../../shared/types";
import { Breadcrumb, type BreadcrumbSegment } from "./Breadcrumb";
import { FeatureCard } from "./FeatureCard";
import { StatusGroupHeader } from "./StatusGroupHeader";
import { StatusFilterControls } from "./StatusFilterControls";
import { ArchivedFeaturesSection } from "./ArchivedFeaturesSection";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { FeatureListView } from "./FeatureListView";
import {
  groupFeaturesByStatus,
  type FeatureGroup,
} from "../utils/featureGrouping";
import { filterFeaturesBySearch } from "../utils/featureSearch";
import {
  filterFeaturesByStatus,
  buildStatusFilterOptions,
  type StatusFilterValue,
} from "../utils/featureStatusFilter";

interface ProjectFeatureViewProps {
  readonly projectId: string;
  readonly features: readonly FeatureSummary[];
  readonly archivedFeatures?: readonly ArchivedFeature[];
  readonly onNavigateOverview: () => void;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
  readonly onRestoreFeature?: (featureId: string) => void;
  readonly restoringFeatureId?: string | null;
  readonly onArchiveSuccess?: () => void;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">No features discovered</p>
    <p className="mt-2 text-sm">
      Features will appear here when added to the project.
    </p>
  </div>
);

// --- Pure functions ---

const filterNonEmptyGroups = (
  groups: readonly FeatureGroup[],
): readonly FeatureGroup[] =>
  groups.filter((group) => group.features.length > 0);

// --- Component ---

// --- Search empty state ---

const NoSearchResults = () => (
  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
    <p className="text-lg">No features match your search</p>
  </div>
);

// --- Component ---

export const ProjectFeatureView = ({
  projectId,
  features,
  archivedFeatures = [],
  onNavigateOverview,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
  onRestoreFeature,
  restoringFeatureId = null,
  onArchiveSuccess,
}: ProjectFeatureViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const breadcrumbSegments: BreadcrumbSegment[] = [
    { label: "Overview", onClick: onNavigateOverview },
    { label: projectId },
  ];

  // Apply filters: search first, then status filter
  // Status filter counts are based on search-filtered results
  const searchFiltered = filterFeaturesBySearch(features, searchTerm);
  const statusFilterOptions = buildStatusFilterOptions(searchFiltered);
  const filteredFeatures = filterFeaturesByStatus(searchFiltered, statusFilter);

  const groups = filterNonEmptyGroups(groupFeaturesByStatus(filteredFeatures));
  const hasResults = filteredFeatures.length > 0;
  const isFiltering = searchTerm.trim() !== "" || statusFilter !== "all";

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb segments={breadcrumbSegments} />
      </div>

      {features.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:w-64"
              />
              <ViewModeToggle mode={viewMode} onToggle={setViewMode} />
            </div>
            <StatusFilterControls
              options={statusFilterOptions}
              selected={statusFilter}
              onSelect={setStatusFilter}
            />
          </div>

          {isFiltering && !hasResults ? (
            <NoSearchResults />
          ) : viewMode === 'card' ? (
            <div
              data-testid="feature-grid"
              className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-6"
            >
              {groups.map((group) => (
                <GroupSection
                  key={group.key}
                  group={group}
                  projectId={projectId}
                  onNavigateFeatureBoard={onNavigateFeatureBoard}
                  onNavigateFeatureDocs={onNavigateFeatureDocs}
                  onArchiveSuccess={onArchiveSuccess}
                />
              ))}
            </div>
          ) : (
            <FeatureListView
              groups={groups}
              projectId={projectId}
              onNavigateFeatureBoard={onNavigateFeatureBoard}
              onNavigateFeatureDocs={onNavigateFeatureDocs}
              onArchiveSuccess={onArchiveSuccess}
            />
          )}

          <div className="mt-6">
            <ArchivedFeaturesSection
              archivedFeatures={archivedFeatures}
              onRestore={onRestoreFeature ?? (() => {})}
              restoring={restoringFeatureId}
            />
          </div>
        </>
      )}
    </div>
  );
};

// --- Internal component ---

interface GroupSectionProps {
  readonly group: FeatureGroup;
  readonly projectId: string;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
  readonly onArchiveSuccess?: () => void;
}

const GroupSection = ({
  group,
  projectId,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
  onArchiveSuccess,
}: GroupSectionProps) => (
  <>
    <StatusGroupHeader
      groupName={group.displayName}
      count={group.features.length}
    />
    {group.features.map((feature) => (
      <FeatureCard
        key={feature.featureId}
        feature={feature}
        projectId={projectId}
        onArchiveSuccess={onArchiveSuccess}
        onClick={() =>
          feature.hasRoadmap
            ? onNavigateFeatureBoard(feature.featureId)
            : onNavigateFeatureDocs(feature.featureId)
        }
      />
    ))}
  </>
);

import { useState } from 'react';
import type { FeatureSummary } from '../../shared/types';
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb';
import { FeatureCard } from './FeatureCard';
import { StatusGroupHeader } from './StatusGroupHeader';
import { groupFeaturesByStatus, type FeatureGroup } from '../utils/featureGrouping';
import { filterFeaturesBySearch } from '../utils/featureSearch';

interface ProjectFeatureViewProps {
  readonly projectId: string;
  readonly features: readonly FeatureSummary[];
  readonly onNavigateOverview: () => void;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">No features discovered</p>
    <p className="mt-2 text-sm">Features will appear here when added to the project.</p>
  </div>
);

// --- Pure functions ---

const filterNonEmptyGroups = (groups: readonly FeatureGroup[]): readonly FeatureGroup[] =>
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
  onNavigateOverview,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
}: ProjectFeatureViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Overview', onClick: onNavigateOverview },
    { label: projectId },
  ];

  // Filter features BEFORE grouping
  const filteredFeatures = filterFeaturesBySearch(features, searchTerm);
  const groups = filterNonEmptyGroups(groupFeaturesByStatus(filteredFeatures));
  const hasSearchResults = filteredFeatures.length > 0;
  const isSearching = searchTerm.trim() !== '';

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb segments={breadcrumbSegments} />
      </div>

      {features.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div
            data-testid="feature-grid"
            className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {isSearching && !hasSearchResults ? (
              <NoSearchResults />
            ) : (
              groups.map((group) => (
                <GroupSection
                  key={group.key}
                  group={group}
                  onNavigateFeatureBoard={onNavigateFeatureBoard}
                  onNavigateFeatureDocs={onNavigateFeatureDocs}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

// --- Internal component ---

interface GroupSectionProps {
  readonly group: FeatureGroup;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
}

const GroupSection = ({
  group,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
}: GroupSectionProps) => (
  <>
    <StatusGroupHeader groupName={group.displayName} count={group.features.length} />
    {group.features.map((feature) => (
      <FeatureCard
        key={feature.featureId}
        feature={feature}
        onClick={() =>
          feature.hasRoadmap
            ? onNavigateFeatureBoard(feature.featureId)
            : onNavigateFeatureDocs(feature.featureId)
        }
      />
    ))}
  </>
);

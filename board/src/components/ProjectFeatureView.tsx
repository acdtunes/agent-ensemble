import type { FeatureSummary } from '../../shared/types';
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb';
import { FeatureCard } from './FeatureCard';
import { StatusGroupHeader } from './StatusGroupHeader';
import { groupFeaturesByStatus, type FeatureGroup } from '../utils/featureGrouping';

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

export const ProjectFeatureView = ({
  projectId,
  features,
  onNavigateOverview,
  onNavigateFeatureBoard,
  onNavigateFeatureDocs,
}: ProjectFeatureViewProps) => {
  const breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Overview', onClick: onNavigateOverview },
    { label: projectId },
  ];

  const groups = filterNonEmptyGroups(groupFeaturesByStatus(features));

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb segments={breadcrumbSegments} />
      </div>

      {features.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          data-testid="feature-grid"
          className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {groups.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              onNavigateFeatureBoard={onNavigateFeatureBoard}
              onNavigateFeatureDocs={onNavigateFeatureDocs}
            />
          ))}
        </div>
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

import type { FeatureSummary } from '../../shared/types';
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb';
import { FeatureCard } from './FeatureCard';

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
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(feature => (
            <FeatureCard
              key={feature.featureId}
              feature={feature}
              onBoardClick={
                feature.hasRoadmap
                  ? () => onNavigateFeatureBoard(feature.featureId)
                  : undefined
              }
              onDocsClick={() => onNavigateFeatureDocs(feature.featureId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

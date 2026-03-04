import { useMemo } from 'react';
import type { Roadmap, FeatureSummary } from '../../shared/types';
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb';
import { ContextDropdowns } from './ContextDropdowns';
import { KanbanBoard } from './KanbanBoard';
import {
  filterBoardCapableFeatures,
  buildFeatureBoardUrl,
  buildFeatureDocsUrl,
} from '../utils/featureBoardUtils';

interface FeatureBoardViewProps {
  readonly projectId: string;
  readonly featureId: string;
  readonly roadmap: Roadmap;
  readonly features: readonly FeatureSummary[];
  readonly onNavigateOverview: () => void;
  readonly onNavigateProject: () => void;
}

const navigateToFeatureBoard = (projectId: string, featureId: string): void => {
  window.location.hash = buildFeatureBoardUrl(projectId, featureId);
};

export const FeatureBoardView = ({
  projectId,
  featureId,
  roadmap,
  features,
  onNavigateOverview,
  onNavigateProject,
}: FeatureBoardViewProps) => {
  const boardCapableFeatures = useMemo(
    () => filterBoardCapableFeatures(features),
    [features],
  );

  const breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Overview', onClick: onNavigateOverview },
    { label: projectId, onClick: onNavigateProject },
    { label: featureId },
  ];

  const handleFeatureChange = (nextFeatureId: string): void => {
    navigateToFeatureBoard(projectId, nextFeatureId);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumb segments={breadcrumbSegments} />

        <nav className="flex gap-1">
          <a
            href={buildFeatureBoardUrl(projectId, featureId)}
            className="px-3 py-1 text-sm rounded-t text-gray-100 border-b-2 border-blue-500"
          >
            Board
          </a>
          <a
            href={buildFeatureDocsUrl(projectId, featureId)}
            className="px-3 py-1 text-sm rounded-t text-gray-400 hover:text-gray-200"
          >
            Docs
          </a>
        </nav>
      </div>

      <div className="mb-4">
        <ContextDropdowns
          projectId={projectId}
          featureId={featureId}
          features={boardCapableFeatures}
          onFeatureChange={handleFeatureChange}
        />
      </div>

      <KanbanBoard roadmap={roadmap} />
    </div>
  );
};

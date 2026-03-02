import type { DocTree, FeatureSummary } from '../../shared/types';
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb';
import { ContextDropdowns } from './ContextDropdowns';
import { DocViewer } from './DocViewer';
import {
  buildFeatureBoardUrl,
  buildFeatureDocsUrl,
} from '../utils/featureBoardUtils';

interface FeatureDocsViewProps {
  readonly projectId: string;
  readonly featureId: string;
  readonly tree: DocTree | null;
  readonly features: readonly FeatureSummary[];
  readonly error?: string;
  readonly onNavigateOverview: () => void;
  readonly onNavigateProject: () => void;
}

const navigateToFeatureDocs = (projectId: string, featureId: string): void => {
  window.location.hash = buildFeatureDocsUrl(projectId, featureId);
};

export const FeatureDocsView = ({
  projectId,
  featureId,
  tree,
  features,
  error,
  onNavigateOverview,
  onNavigateProject,
}: FeatureDocsViewProps) => {
  const breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Overview', onClick: onNavigateOverview },
    { label: projectId, onClick: onNavigateProject },
    { label: featureId },
  ];

  const handleFeatureChange = (nextFeatureId: string): void => {
    navigateToFeatureDocs(projectId, nextFeatureId);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumb segments={breadcrumbSegments} />

        <nav className="flex gap-1">
          <a
            href={buildFeatureBoardUrl(projectId, featureId)}
            className="px-3 py-1 text-sm rounded-t text-gray-400 hover:text-gray-200"
          >
            Board
          </a>
          <a
            href={buildFeatureDocsUrl(projectId, featureId)}
            className="px-3 py-1 text-sm rounded-t text-gray-100 border-b-2 border-blue-500"
          >
            Docs
          </a>
        </nav>
      </div>

      <div className="mb-4">
        <ContextDropdowns
          projectId={projectId}
          featureId={featureId}
          features={features}
          onFeatureChange={handleFeatureChange}
        />
      </div>

      <DocViewer
        projectId={projectId}
        tree={tree}
        docsRoot={`docs/feature/${featureId}`}
        error={error}
      />
    </div>
  );
};

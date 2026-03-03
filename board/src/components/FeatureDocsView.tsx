import { useCallback } from 'react';
import type { DocTree, FeatureSummary } from '../../shared/types';
import { ContextDropdowns } from './ContextDropdowns';
import { DocViewer } from './DocViewer';
import { buildFeatureDocsUrl } from '../utils/featureBoardUtils';

interface FeatureDocsViewProps {
  readonly projectId: string;
  readonly featureId: string;
  readonly tree: DocTree | null;
  readonly features: readonly FeatureSummary[];
  readonly error?: string;
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
}: FeatureDocsViewProps) => {
  const handleFeatureChange = (nextFeatureId: string): void => {
    navigateToFeatureDocs(projectId, nextFeatureId);
  };

  const fetchContent = useCallback(async (path: string): Promise<string> => {
    const response = await fetch(`/api/projects/${projectId}/features/${featureId}/docs/content?path=${encodeURIComponent(path)}`);
    if (!response.ok) return '';
    return response.text();
  }, [projectId, featureId]);

  return (
    <div>
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
        fetchContent={fetchContent}
        docsRoot={`docs/feature/${featureId}`}
        error={error}
      />
    </div>
  );
};

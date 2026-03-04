import { useCallback } from 'react';
import type { MultiRootDocTree, FeatureSummary } from '../../shared/types';
import { ContextDropdowns } from './ContextDropdowns';
import { MultiRootDocViewer } from './MultiRootDocViewer';
import { buildFeatureDocsUrl } from '../utils/featureBoardUtils';

interface FeatureDocsViewProps {
  readonly projectId: string;
  readonly featureId: string;
  readonly tree: MultiRootDocTree | null;
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

  const fetchContent = useCallback(async (label: string, path: string): Promise<string> => {
    // Backend expects path format: {label}/{relativePath}
    const fullPath = `${label}/${path}`;
    const response = await fetch(`/api/projects/${projectId}/features/${featureId}/docs/content?path=${encodeURIComponent(fullPath)}`);
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

      <MultiRootDocViewer
        projectId={projectId}
        tree={tree}
        fetchContent={fetchContent}
        error={error}
      />
    </div>
  );
};

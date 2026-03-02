import { useState, useEffect, useCallback } from 'react';
import type { FeatureSummary } from '../../shared/types';

// --- Hook return type ---

export interface UseFeatureListResult {
  readonly features: readonly FeatureSummary[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

// --- Pure helpers ---

const buildFeaturesUrl = (projectId: string): string =>
  `/api/projects/${projectId}/features`;

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to load features';
  } catch {
    return 'Failed to load features';
  }
};

// --- Hook ---

export const useFeatureList = (projectId: string): UseFeatureListResult => {
  const [features, setFeatures] = useState<readonly FeatureSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildFeaturesUrl(projectId));
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setFeatures([]);
        setError(errorMessage);
        return;
      }
      const data = (await response.json()) as FeatureSummary[];
      setFeatures(data);
    } catch {
      setFeatures([]);
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures, fetchCount]);

  const refetch = useCallback(() => {
    setFetchCount(prev => prev + 1);
  }, []);

  return { features, loading, error, refetch };
};

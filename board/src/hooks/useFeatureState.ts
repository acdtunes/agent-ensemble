import { useState, useEffect, useCallback } from 'react';
import type { Roadmap, RoadmapSummary } from '../../shared/types';

// --- Hook return type ---

export interface UseFeatureStateResult {
  readonly roadmap: Roadmap | null;
  readonly summary: RoadmapSummary | null;
  readonly loading: boolean;
  readonly error: string | null;
}

// --- Pure helpers ---

const buildRoadmapUrl = (projectId: string, featureId: string): string =>
  `/api/projects/${projectId}/features/${featureId}/roadmap`;

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
};

// --- Response shape from server ---

interface RoadmapResponse extends Roadmap {
  readonly summary: RoadmapSummary;
}

// --- Hook ---

export const useFeatureState = (
  projectId: string,
  featureId: string,
): UseFeatureStateResult => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [summary, setSummary] = useState<RoadmapSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatureData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRoadmap(null);
    setSummary(null);

    try {
      const response = await fetch(buildRoadmapUrl(projectId, featureId));

      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setError(errorMessage);
        return;
      }

      const data = (await response.json()) as RoadmapResponse;
      setRoadmap({ roadmap: data.roadmap, phases: data.phases });
      setSummary(data.summary);
    } catch {
      setError('Failed to load feature data');
    } finally {
      setLoading(false);
    }
  }, [projectId, featureId]);

  useEffect(() => {
    fetchFeatureData();
  }, [fetchFeatureData]);

  return { roadmap, summary, loading, error };
};

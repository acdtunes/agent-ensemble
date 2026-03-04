import { useState, useEffect, useCallback } from "react";
import type { ArchivedFeature } from "../../shared/types";

// --- Hook return type ---

export interface UseArchivedFeaturesResult {
  readonly archivedFeatures: readonly ArchivedFeature[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

// --- Pure helpers ---

const buildArchiveUrl = (projectId: string): string =>
  `/api/projects/${projectId}/archive`;

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Failed to load archived features";
  } catch {
    return "Failed to load archived features";
  }
};

// --- Hook ---

export const useArchivedFeatures = (
  projectId: string,
): UseArchivedFeaturesResult => {
  const [archivedFeatures, setArchivedFeatures] = useState<
    readonly ArchivedFeature[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const fetchArchivedFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildArchiveUrl(projectId));
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setArchivedFeatures([]);
        setError(errorMessage);
        return;
      }
      const data = (await response.json()) as { archivedFeatures: ArchivedFeature[] };
      setArchivedFeatures(data.archivedFeatures);
    } catch {
      setArchivedFeatures([]);
      setError("Failed to load archived features");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchArchivedFeatures();
  }, [fetchArchivedFeatures, fetchCount]);

  const refetch = useCallback(() => {
    setFetchCount((prev) => prev + 1);
  }, []);

  return { archivedFeatures, loading, error, refetch };
};

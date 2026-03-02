import { useState, useEffect, useCallback } from 'react';

// --- Hook return type ---

export interface UseDocContentResult {
  readonly content: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly retry: () => void;
}

// --- Pure helpers ---

const buildContentUrl = (projectId: string, docPath: string, featureId?: string): string =>
  featureId !== undefined
    ? `/api/projects/${projectId}/features/${featureId}/docs/content?path=${encodeURIComponent(docPath)}`
    : `/api/projects/${projectId}/docs/content?path=${encodeURIComponent(docPath)}`;

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to load document';
  } catch {
    return 'Failed to load document';
  }
};

// --- Hook ---

export const useDocContent = (
  projectId: string,
  docPath: string | null,
  featureId?: string,
): UseDocContentResult => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchContent = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildContentUrl(projectId, path, featureId));
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setContent(null);
        setError(errorMessage);
        return;
      }
      const text = await response.text();
      setContent(text);
    } catch {
      setContent(null);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [projectId, featureId]);

  useEffect(() => {
    if (docPath === null) return;
    fetchContent(docPath);
  }, [docPath, fetchContent, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return { content, loading, error, retry };
};

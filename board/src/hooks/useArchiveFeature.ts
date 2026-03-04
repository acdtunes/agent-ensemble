import { useState, useCallback } from 'react';

// --- Result type ---

type ArchiveResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// --- Hook return type ---

export interface UseArchiveFeatureResult {
  readonly archiving: boolean;
  readonly error: string | null;
  readonly archiveFeature: (projectId: string, featureId: string) => Promise<ArchiveResult>;
}

// --- Pure helpers ---

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to archive feature';
  } catch {
    return 'Failed to archive feature';
  }
};

// --- Hook ---

export const useArchiveFeature = (): UseArchiveFeatureResult => {
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archiveFeature = useCallback(
    async (projectId: string, featureId: string): Promise<ArchiveResult> => {
      setArchiving(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/features/${featureId}/archive`, {
          method: 'POST',
        });
        if (!response.ok) {
          const errorMessage = await parseErrorBody(response);
          setError(errorMessage);
          return { ok: false, error: errorMessage };
        }
        return { ok: true };
      } catch {
        const errorMessage = 'Failed to archive feature';
        setError(errorMessage);
        return { ok: false, error: errorMessage };
      } finally {
        setArchiving(false);
      }
    },
    [],
  );

  return { archiving, error, archiveFeature };
};

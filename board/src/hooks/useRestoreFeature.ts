import { useState, useCallback } from 'react';

// --- Result type ---

type RestoreResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// --- Hook return type ---

export interface UseRestoreFeatureResult {
  readonly restoring: boolean;
  readonly error: string | null;
  readonly restoreFeature: (projectId: string, featureId: string) => Promise<RestoreResult>;
}

// --- Pure helpers ---

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to restore feature';
  } catch {
    return 'Failed to restore feature';
  }
};

// --- Hook ---

export const useRestoreFeature = (): UseRestoreFeatureResult => {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreFeature = useCallback(
    async (projectId: string, featureId: string): Promise<RestoreResult> => {
      setRestoring(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/archive/${featureId}/restore`, {
          method: 'POST',
        });
        if (!response.ok) {
          const errorMessage = await parseErrorBody(response);
          setError(errorMessage);
          return { ok: false, error: errorMessage };
        }
        return { ok: true };
      } catch {
        const errorMessage = 'Failed to restore feature';
        setError(errorMessage);
        return { ok: false, error: errorMessage };
      } finally {
        setRestoring(false);
      }
    },
    [],
  );

  return { restoring, error, restoreFeature };
};

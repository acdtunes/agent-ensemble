import { useState, useCallback } from 'react';

// --- Result type ---

type RemoveResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// --- Hook return type ---

export interface UseRemoveProjectResult {
  readonly removing: boolean;
  readonly error: string | null;
  readonly removeProject: (projectId: string) => Promise<RemoveResult>;
}

// --- Pure helpers ---

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to remove project';
  } catch {
    return 'Failed to remove project';
  }
};

// --- Hook ---

export const useRemoveProject = (): UseRemoveProjectResult => {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeProject = useCallback(async (projectId: string): Promise<RemoveResult> => {
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setError(errorMessage);
        return { ok: false, error: errorMessage };
      }
      return { ok: true };
    } catch {
      const errorMessage = 'Failed to remove project';
      setError(errorMessage);
      return { ok: false, error: errorMessage };
    } finally {
      setRemoving(false);
    }
  }, []);

  return { removing, error, removeProject };
};

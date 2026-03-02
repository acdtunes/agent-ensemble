import { useState, useCallback } from 'react';

// --- Result type ---

type AddResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// --- Hook return type ---

export interface UseAddProjectResult {
  readonly submitting: boolean;
  readonly error: string | null;
  readonly addProject: (projectPath: string) => Promise<AddResult>;
}

// --- Pure helpers ---

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to add project';
  } catch {
    return 'Failed to add project';
  }
};

// --- Hook ---

export const useAddProject = (): UseAddProjectResult => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProject = useCallback(async (projectPath: string): Promise<AddResult> => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setError(errorMessage);
        return { ok: false, error: errorMessage };
      }
      return { ok: true };
    } catch {
      const errorMessage = 'Failed to add project';
      setError(errorMessage);
      return { ok: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, addProject };
};

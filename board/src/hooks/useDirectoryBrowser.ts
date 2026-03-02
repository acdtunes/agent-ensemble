import { useState, useCallback } from 'react';
import type { BrowseEntry, BrowseResponse } from '../../shared/types';

// --- Hook return type ---

export interface UseDirectoryBrowserResult {
  readonly currentPath: string | null;
  readonly entries: readonly BrowseEntry[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly navigateTo: (path?: string) => Promise<void>;
  readonly navigateUp: () => Promise<void>;
  readonly reset: () => Promise<void>;
}

// --- Pure helpers ---

const buildBrowseUrl = (path?: string): string =>
  path !== undefined
    ? `/api/browse?path=${encodeURIComponent(path)}`
    : '/api/browse';

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Failed to browse directory';
  } catch {
    return 'Failed to browse directory';
  }
};

// --- Hook ---

export const useDirectoryBrowser = (): UseDirectoryBrowserResult => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<readonly BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);

  const navigateTo = useCallback(async (path?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const url = buildBrowseUrl(path);
      const response = await fetch(url);
      if (!response.ok) {
        const errorMessage = await parseErrorBody(response);
        setError(errorMessage);
        setEntries([]);
        return;
      }
      const data = (await response.json()) as BrowseResponse;
      setCurrentPath(data.path);
      setEntries(data.entries);
      setParent(data.parent);
    } catch {
      setError('Failed to browse directory');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateUp = useCallback(async (): Promise<void> => {
    if (parent !== null) {
      await navigateTo(parent);
    }
  }, [parent, navigateTo]);

  const reset = useCallback(async (): Promise<void> => {
    await navigateTo();
  }, [navigateTo]);

  return { currentPath, entries, loading, error, navigateTo, navigateUp, reset };
};

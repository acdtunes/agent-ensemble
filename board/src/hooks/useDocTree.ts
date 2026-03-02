import { useState, useEffect, useCallback } from 'react';
import type { DocTree } from '../../shared/types';

// --- Hook return type ---

export interface UseDocTreeResult {
  readonly tree: DocTree | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

// --- Hook ---

export const useDocTree = (projectId: string): UseDocTreeResult => {
  const [tree, setTree] = useState<DocTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/docs/tree`);
      if (!response.ok) {
        setTree(null);
        setError(
          response.status === 404
            ? 'Project not found'
            : 'Failed to fetch documentation tree',
        );
        return;
      }
      const data = (await response.json()) as DocTree;
      setTree(data);
    } catch {
      setTree(null);
      setError('Failed to fetch documentation tree');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, error, refetch: fetchTree };
};

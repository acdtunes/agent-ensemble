import { useState, useEffect, useCallback } from 'react';
import type { DocTree, MultiRootDocTree } from '../../shared/types';

// --- Hook return type ---

export interface UseDocTreeResult {
  readonly tree: DocTree | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export interface UseMultiRootDocTreeResult {
  readonly tree: MultiRootDocTree | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

// --- Pure helpers ---

const buildTreeUrl = (projectId: string, featureId?: string): string =>
  featureId !== undefined
    ? `/api/projects/${projectId}/features/${featureId}/docs/tree`
    : `/api/projects/${projectId}/docs/tree`;

// --- Hook ---

export const useDocTree = (projectId: string, featureId?: string): UseDocTreeResult => {
  const [tree, setTree] = useState<DocTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildTreeUrl(projectId, featureId));
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
  }, [projectId, featureId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, error, refetch: fetchTree };
};

// --- Multi-root hook for feature docs ---

export const useFeatureDocTree = (projectId: string, featureId: string): UseMultiRootDocTreeResult => {
  const [tree, setTree] = useState<MultiRootDocTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/features/${featureId}/docs/tree`);
      if (!response.ok) {
        setTree(null);
        setError(
          response.status === 404
            ? 'Feature not found'
            : 'Failed to fetch documentation tree',
        );
        return;
      }
      const data = (await response.json()) as MultiRootDocTree;
      setTree(data);
    } catch {
      setTree(null);
      setError('Failed to fetch documentation tree');
    } finally {
      setLoading(false);
    }
  }, [projectId, featureId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, error, refetch: fetchTree };
};

/**
 * Unit tests for useDocTree hook.
 *
 * Driving port: useDocTree(projectId, featureId?)
 * Tests: project-level fetch, feature-scoped fetch, loading/error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const HOOK_PATH = ['..', 'hooks', 'useDocTree'].join('/');

// --- Fetch mock helpers ---

const createFetchSuccess = (body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as Partial<Response>);

const createFetchError = (status: number) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
  } as Partial<Response>);

beforeEach(() => {
  vi.stubGlobal('fetch', createFetchSuccess({ root: [], fileCount: 0 }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDocTree', () => {
  it('fetches project-level tree when no featureId', async () => {
    const tree = { root: [{ type: 'file', name: 'readme.md', path: 'readme.md' }], fileCount: 1 };
    vi.stubGlobal('fetch', createFetchSuccess(tree));

    const { useDocTree } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocTree('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toEqual(tree);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/docs/tree');
  });

  it('fetches feature-scoped tree when featureId provided', async () => {
    const tree = { root: [{ type: 'file', name: 'spec.md', path: 'spec.md' }], fileCount: 1 };
    vi.stubGlobal('fetch', createFetchSuccess(tree));

    const { useDocTree } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocTree('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toEqual(tree);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/api/projects/my-project/features/auth-flow/docs/tree',
    );
  });

  it('sets error on 404 response', async () => {
    vi.stubGlobal('fetch', createFetchError(404));

    const { useDocTree } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocTree('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toBeNull();
    expect(result.current.error).toBe('Project not found');
  });

  it('sets error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { useDocTree } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocTree('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toBeNull();
    expect(result.current.error).toBe('Failed to fetch documentation tree');
  });

  it('returns loading true initially', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    const { useDocTree } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocTree('my-project'));

    expect(result.current.loading).toBe(true);
    expect(result.current.tree).toBeNull();
  });
});

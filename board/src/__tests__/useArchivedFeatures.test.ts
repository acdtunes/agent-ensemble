/**
 * Unit tests for useArchivedFeatures hook.
 *
 * Driving port: useArchivedFeatures(projectId)
 * Tests: fetch lifecycle, loading/error/success states, refetch on project change
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ArchivedFeature, FeatureId } from '../../shared/types';

// Computed path prevents Vite from statically resolving before file exists.
const HOOK_PATH = ['..', 'hooks', 'useArchivedFeatures'].join('/');

// --- Fixtures ---

const makeArchivedFeature = (id: string, overrides: Partial<ArchivedFeature> = {}): ArchivedFeature => ({
  featureId: id as FeatureId,
  name: id,
  archivedAt: '2026-01-15T10:30:00Z',
  ...overrides,
});

// --- Fetch mock helpers ---

const createFetchSuccess = (features: readonly ArchivedFeature[]) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(features),
  } as Partial<Response>);

const createFetchError = (status: number, body: { error: string }) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Partial<Response>);

const createFetchNetworkError = () =>
  vi.fn().mockRejectedValue(new Error('Network error'));

beforeEach(() => {
  vi.stubGlobal('fetch', createFetchSuccess([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useArchivedFeatures', () => {
  it('fetches archived features on mount and returns them', async () => {
    const archived = [
      makeArchivedFeature('old-auth'),
      makeArchivedFeature('legacy-ui'),
    ];
    vi.stubGlobal('fetch', createFetchSuccess(archived));

    const { useArchivedFeatures } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useArchivedFeatures('my-project'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.archivedFeatures).toEqual(archived);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/archive');
  });

  it('returns error on 404', async () => {
    vi.stubGlobal('fetch', createFetchError(404, { error: 'Project not found' }));

    const { useArchivedFeatures } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useArchivedFeatures('unknown'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.archivedFeatures).toEqual([]);
    expect(result.current.error).toBe('Project not found');
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', createFetchNetworkError());

    const { useArchivedFeatures } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useArchivedFeatures('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.archivedFeatures).toEqual([]);
    expect(result.current.error).toBe('Failed to load archived features');
  });

  it('re-fetches when projectId changes', async () => {
    const archivedA = [makeArchivedFeature('feat-a')];
    const archivedB = [makeArchivedFeature('feat-b')];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(archivedA) } as Partial<Response>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(archivedB) } as Partial<Response>);
    vi.stubGlobal('fetch', fetchMock);

    const { useArchivedFeatures } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useArchivedFeatures(projectId),
      { initialProps: { projectId: 'project-a' } },
    );

    await waitFor(() => {
      expect(result.current.archivedFeatures).toEqual(archivedA);
    });

    rerender({ projectId: 'project-b' });

    await waitFor(() => {
      expect(result.current.archivedFeatures).toEqual(archivedB);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-a/archive');
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-b/archive');
  });

  it('returns empty archivedFeatures while loading', async () => {
    vi.stubGlobal('fetch', createFetchSuccess([]));

    const { useArchivedFeatures } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useArchivedFeatures('my-project'));

    expect(result.current.archivedFeatures).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

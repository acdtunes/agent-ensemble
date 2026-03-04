/**
 * Unit tests for useFeatureList hook.
 *
 * Driving port: useFeatureList(projectId)
 * Tests: fetch lifecycle, loading/error/success states, refetch, projectId change
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { FeatureSummary, FeatureId } from '../../shared/types';

// Computed path prevents Vite from statically resolving before file exists.
const HOOK_PATH = ['..', 'hooks', 'useFeatureList'].join('/');

// --- Fixtures ---

const makeFeatureSummary = (id: string, overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: id as FeatureId,
  name: id,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: 5,
  done: 2,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// --- Fetch mock helpers ---

const createFetchSuccess = (features: readonly FeatureSummary[]) =>
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

describe('useFeatureList', () => {
  it('fetches features on mount and returns them', async () => {
    const features = [makeFeatureSummary('auth-flow'), makeFeatureSummary('user-profile')];
    vi.stubGlobal('fetch', createFetchSuccess(features));

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureList('my-project'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual(features);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/features');
  });

  it('returns error on 404', async () => {
    vi.stubGlobal('fetch', createFetchError(404, { error: 'Project not found' }));

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureList('unknown'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual([]);
    expect(result.current.error).toBe('Project not found');
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', createFetchNetworkError());

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureList('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual([]);
    expect(result.current.error).toBe('Failed to load features');
  });

  it('refetch re-fetches on demand', async () => {
    const fetchMock = createFetchError(500, { error: 'Server error' });
    vi.stubGlobal('fetch', fetchMock);

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureList('my-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');

    // Switch to success for refetch
    const features = [makeFeatureSummary('auth-flow')];
    vi.stubGlobal('fetch', createFetchSuccess(features));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual(features);
    expect(result.current.error).toBeNull();
  });

  it('re-fetches when projectId changes', async () => {
    const featuresA = [makeFeatureSummary('feat-a')];
    const featuresB = [makeFeatureSummary('feat-b')];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(featuresA) } as Partial<Response>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(featuresB) } as Partial<Response>);
    vi.stubGlobal('fetch', fetchMock);

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useFeatureList(projectId),
      { initialProps: { projectId: 'project-a' } },
    );

    await waitFor(() => {
      expect(result.current.features).toEqual(featuresA);
    });

    rerender({ projectId: 'project-b' });

    await waitFor(() => {
      expect(result.current.features).toEqual(featuresB);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-a/features');
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-b/features');
  });

  it('returns empty features while loading', async () => {
    vi.stubGlobal('fetch', createFetchSuccess([]));

    const { useFeatureList } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureList('my-project'));

    expect(result.current.features).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

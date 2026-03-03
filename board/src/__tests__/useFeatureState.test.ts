/**
 * Unit tests for useFeatureState hook.
 *
 * Driving port: useFeatureState(projectId, featureId)
 * Tests: single /roadmap endpoint fetch, loading/error states, no double-fetch
 *
 * Acceptance criteria:
 * - Hook fetches single /roadmap endpoint (not /plan + /state)
 * - Hook returns Roadmap and computed summary
 * - Loading and error states handled
 * - No double-fetch of plan + state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const HOOK_PATH = ['..', 'hooks', 'useFeatureState'].join('/');

// --- Fetch mock helpers ---

type FetchResponse = Partial<Response>;

const jsonResponse = (status: number, body: unknown): FetchResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

const createRoutedFetch = (routes: Record<string, FetchResponse>) =>
  vi.fn().mockImplementation((url: string) => {
    for (const [pattern, response] of Object.entries(routes)) {
      if (url.includes(pattern)) return Promise.resolve(response);
    }
    return Promise.resolve(jsonResponse(404, { error: 'Not found' }));
  });

// --- Fixtures ---

const makeRoadmapResponse = () => ({
  roadmap: { project_id: 'my-project', created_at: '2026-03-01T00:00:00Z', total_steps: 2, phases: 1 },
  phases: [{
    id: '01',
    name: 'Foundation',
    steps: [
      {
        id: '01-01', name: 'Step A', files_to_modify: [], dependencies: [], criteria: [],
        status: 'approved', teammate_id: 'crafter-01',
        started_at: '2026-03-01T01:00:00Z', completed_at: '2026-03-01T02:00:00Z', review_attempts: 1,
      },
      {
        id: '01-02', name: 'Step B', files_to_modify: [], dependencies: [], criteria: [],
        status: 'in_progress', teammate_id: 'crafter-02',
        started_at: '2026-03-01T03:00:00Z', completed_at: null, review_attempts: 0,
      },
    ],
  }],
  summary: { total_steps: 2, total_phases: 1, completed: 1, failed: 0, in_progress: 1, pending: 0 },
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {})));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFeatureState', () => {
  it('fetches single /roadmap endpoint and returns roadmap with summary', async () => {
    const response = makeRoadmapResponse();
    vi.stubGlobal('fetch', createRoutedFetch({
      '/roadmap': jsonResponse(200, response),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toEqual({ roadmap: response.roadmap, phases: response.phases });
    expect(result.current.summary).toEqual(response.summary);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/features/auth-flow/roadmap');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not fetch /plan or /state endpoints', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/roadmap': jsonResponse(200, makeRoadmapResponse()),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0] as string);
    expect(calls.some((url: string) => url.includes('/plan'))).toBe(false);
    expect(calls.some((url: string) => url.includes('/state'))).toBe(false);
  });

  it('returns error when roadmap is not found (404)', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/roadmap': jsonResponse(404, { error: 'Feature roadmap not found' }),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe('Feature roadmap not found');
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe('Failed to load feature data');
  });

  it('re-fetches when featureId changes', async () => {
    const response = makeRoadmapResponse();
    const fetchMock = createRoutedFetch({
      '/roadmap': jsonResponse(200, response),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result, rerender } = renderHook(
      ({ featureId }: { featureId: string }) => useFeatureState('my-project', featureId),
      { initialProps: { featureId: 'auth-flow' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    fetchMock.mockClear();

    rerender({ featureId: 'user-profile' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/my-project/features/user-profile/roadmap');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns error on non-404 server error', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/roadmap': jsonResponse(500, { error: 'Internal server error' }),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe('Internal server error');
  });
});

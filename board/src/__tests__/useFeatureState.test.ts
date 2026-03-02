/**
 * Unit tests for useFeatureState hook.
 *
 * Driving port: useFeatureState(projectId, featureId)
 * Tests: parallel fetch of plan + state, 404 handling, loading/error states
 *
 * Acceptance criteria:
 * - Hook fetches plan and state for a feature via HTTP
 * - Missing execution log (404 on state) returns null state (not an error)
 * - Missing roadmap (404 on plan) returns error
 * - Returns loading and error states
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

const makePlan = () => ({
  schema_version: '1.0',
  summary: { total_steps: 2, total_layers: 1, max_parallelism: 2, requires_worktrees: false },
  layers: [{
    layer: 1,
    parallel: true,
    use_worktrees: false,
    steps: [
      { step_id: '01-01', name: 'Step A', files_to_modify: [] },
      { step_id: '01-02', name: 'Step B', files_to_modify: [] },
    ],
  }],
});

const makeState = () => ({
  schema_version: '1.0',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  plan_path: 'docs/feature/auth-flow/roadmap.yaml',
  current_layer: 1,
  summary: { total_steps: 2, total_layers: 1, completed: 1, failed: 0, in_progress: 1 },
  steps: {
    '01-01': {
      step_id: '01-01', name: 'Step A', layer: 1, status: 'approved',
      teammate_id: 'crafter-01', started_at: '2026-03-01T01:00:00Z',
      completed_at: '2026-03-01T02:00:00Z', review_attempts: 1, files_to_modify: [],
    },
    '01-02': {
      step_id: '01-02', name: 'Step B', layer: 1, status: 'in_progress',
      teammate_id: 'crafter-02', started_at: '2026-03-01T03:00:00Z',
      completed_at: null, review_attempts: 0, files_to_modify: [],
    },
  },
  teammates: {},
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {})));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFeatureState', () => {
  it('fetches both plan and state for a feature', async () => {
    const plan = makePlan();
    const state = makeState();
    vi.stubGlobal('fetch', createRoutedFetch({
      '/plan': jsonResponse(200, plan),
      '/state': jsonResponse(200, state),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toEqual(plan);
    expect(result.current.state).toEqual(state);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/features/auth-flow/plan');
    expect(fetch).toHaveBeenCalledWith('/api/projects/my-project/features/auth-flow/state');
  });

  it('returns null state when execution log is missing (404)', async () => {
    const plan = makePlan();
    vi.stubGlobal('fetch', createRoutedFetch({
      '/plan': jsonResponse(200, plan),
      '/state': jsonResponse(404, { error: 'Execution log not found' }),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toEqual(plan);
    expect(result.current.state).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns error when roadmap is missing (404 on plan)', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/plan': jsonResponse(404, { error: 'Roadmap not found' }),
      '/state': jsonResponse(404, { error: 'Execution log not found' }),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.state).toBeNull();
    expect(result.current.error).toBe('Roadmap not found');
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.state).toBeNull();
    expect(result.current.error).toBe('Failed to load feature data');
  });

  it('re-fetches when featureId changes', async () => {
    const plan = makePlan();
    const state = makeState();
    const fetchMock = createRoutedFetch({
      '/plan': jsonResponse(200, plan),
      '/state': jsonResponse(200, state),
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

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/my-project/features/user-profile/plan');
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/my-project/features/user-profile/state');
  });

  it('returns error on non-404 server error for plan', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/plan': jsonResponse(500, { error: 'Internal server error' }),
      '/state': jsonResponse(200, makeState()),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBe('Internal server error');
  });

  it('returns error on non-404 server error for state', async () => {
    vi.stubGlobal('fetch', createRoutedFetch({
      '/plan': jsonResponse(200, makePlan()),
      '/state': jsonResponse(500, { error: 'Internal server error' }),
    }));

    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.state).toBeNull();
    expect(result.current.error).toBe('Internal server error');
  });
});

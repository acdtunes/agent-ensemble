import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useRestoreFeature } from '../hooks/useRestoreFeature';

afterEach(cleanup);

describe('useRestoreFeature', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useRestoreFeature());
    expect(result.current.restoring).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls POST /api/projects/:id/archive/:featureId/restore and resolves on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRestoreFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.restoreFeature('my-project', 'auth-feature');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/projects/my-project/archive/auth-feature/restore',
      { method: 'POST' },
    );
    expect(outcome).toEqual({ ok: true });
    expect(result.current.restoring).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets restoring to true while request is in flight', async () => {
    let resolvePromise: (value: { ok: boolean }) => void;
    const pendingPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingPromise));

    const { result } = renderHook(() => useRestoreFeature());

    let restorePromise: Promise<unknown>;
    act(() => {
      restorePromise = result.current.restoreFeature('proj', 'feat');
    });

    expect(result.current.restoring).toBe(true);

    await act(async () => {
      resolvePromise!({ ok: true });
      await restorePromise;
    });

    expect(result.current.restoring).toBe(false);
  });

  it('returns error result when server responds with error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Feature not found in archive' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRestoreFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.restoreFeature('my-project', 'missing');
    });

    expect(outcome).toEqual({ ok: false, error: 'Feature not found in archive' });
    expect(result.current.error).toBe('Feature not found in archive');
  });

  it('returns fallback error message when server error has no body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRestoreFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.restoreFeature('proj', 'feat');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to restore feature' });
    expect(result.current.error).toBe('Failed to restore feature');
  });

  it('returns error result on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useRestoreFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.restoreFeature('some-project', 'some-feature');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to restore feature' });
    expect(result.current.error).toBe('Failed to restore feature');
  });

  it('clears previous error on new request', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'First error' }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRestoreFeature());

    await act(async () => {
      await result.current.restoreFeature('proj', 'feat');
    });
    expect(result.current.error).toBe('First error');

    await act(async () => {
      await result.current.restoreFeature('proj', 'feat');
    });
    expect(result.current.error).toBeNull();
  });
});

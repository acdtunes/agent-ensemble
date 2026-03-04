import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useArchiveFeature } from '../hooks/useArchiveFeature';

afterEach(cleanup);

describe('useArchiveFeature', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useArchiveFeature());
    expect(result.current.archiving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls POST /api/projects/:id/features/:featureId/archive and resolves on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useArchiveFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.archiveFeature('my-project', 'auth-feature');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/projects/my-project/features/auth-feature/archive',
      { method: 'POST' },
    );
    expect(outcome).toEqual({ ok: true });
    expect(result.current.archiving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets archiving to true while request is in flight', async () => {
    let resolvePromise: (value: { ok: boolean }) => void;
    const pendingPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingPromise));

    const { result } = renderHook(() => useArchiveFeature());

    let archivePromise: Promise<unknown>;
    act(() => {
      archivePromise = result.current.archiveFeature('proj', 'feat');
    });

    expect(result.current.archiving).toBe(true);

    await act(async () => {
      resolvePromise!({ ok: true });
      await archivePromise;
    });

    expect(result.current.archiving).toBe(false);
  });

  it('returns error result when server responds with error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Feature not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useArchiveFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.archiveFeature('my-project', 'missing');
    });

    expect(outcome).toEqual({ ok: false, error: 'Feature not found' });
    expect(result.current.error).toBe('Feature not found');
  });

  it('returns fallback error message when server error has no body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useArchiveFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.archiveFeature('proj', 'feat');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to archive feature' });
    expect(result.current.error).toBe('Failed to archive feature');
  });

  it('returns error result on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useArchiveFeature());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.archiveFeature('some-project', 'some-feature');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to archive feature' });
    expect(result.current.error).toBe('Failed to archive feature');
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

    const { result } = renderHook(() => useArchiveFeature());

    await act(async () => {
      await result.current.archiveFeature('proj', 'feat');
    });
    expect(result.current.error).toBe('First error');

    await act(async () => {
      await result.current.archiveFeature('proj', 'feat');
    });
    expect(result.current.error).toBeNull();
  });
});

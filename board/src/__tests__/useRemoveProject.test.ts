import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useRemoveProject } from '../hooks/useRemoveProject';

afterEach(cleanup);

describe('useRemoveProject', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useRemoveProject());
    expect(result.current.removing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls DELETE /api/projects/:id and resolves on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRemoveProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.removeProject('my-project');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/my-project', {
      method: 'DELETE',
    });
    expect(outcome).toEqual({ ok: true });
    expect(result.current.removing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns error result when server responds with error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Project not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useRemoveProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.removeProject('missing');
    });

    expect(outcome).toEqual({ ok: false, error: 'Project not found' });
    expect(result.current.error).toBe('Project not found');
  });

  it('returns error result on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useRemoveProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.removeProject('some-project');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to remove project' });
    expect(result.current.error).toBe('Failed to remove project');
  });
});

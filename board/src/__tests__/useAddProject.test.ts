import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAddProject } from '../hooks/useAddProject';

afterEach(cleanup);

describe('useAddProject', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useAddProject());
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls POST /api/projects with projectPath and resolves on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ projectId: 'my-project' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAddProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.addProject('/home/user/my-project');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/home/user/my-project' }),
    });
    expect(outcome).toEqual({ ok: true });
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns error result when server responds with error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Duplicate project' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAddProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.addProject('/some/path');
    });

    expect(outcome).toEqual({ ok: false, error: 'Duplicate project' });
    expect(result.current.error).toBe('Duplicate project');
  });

  it('returns error result on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useAddProject());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.addProject('/some/path');
    });

    expect(outcome).toEqual({ ok: false, error: 'Failed to add project' });
    expect(result.current.error).toBe('Failed to add project');
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseHash, useRouter } from '../hooks/useRouter';

// --- Pure function tests ---

describe('parseHash', () => {
  it('returns overview for empty string', () => {
    expect(parseHash('')).toEqual({ view: 'overview' });
  });

  it('returns overview for hash-only', () => {
    expect(parseHash('#')).toEqual({ view: 'overview' });
  });

  it('returns overview for root path', () => {
    expect(parseHash('#/')).toEqual({ view: 'overview' });
  });

  it('extracts projectId from board route', () => {
    expect(parseHash('#/projects/my-project/board')).toEqual({
      view: 'board',
      projectId: 'my-project',
    });
  });

  it('handles projectId with hyphens and numbers', () => {
    expect(parseHash('#/projects/project-123/board')).toEqual({
      view: 'board',
      projectId: 'project-123',
    });
  });

  it('returns overview for unrecognized paths', () => {
    expect(parseHash('#/unknown/path')).toEqual({ view: 'overview' });
  });

  it('returns overview for partial board route', () => {
    expect(parseHash('#/projects/my-project')).toEqual({ view: 'overview' });
  });
});

// --- Hook tests ---

describe('useRouter', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('returns overview when hash is empty', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useRouter());
    expect(result.current.view).toBe('overview');
  });

  it('returns board route from initial hash', () => {
    window.location.hash = '#/projects/test-proj/board';
    const { result } = renderHook(() => useRouter());
    expect(result.current).toEqual({ view: 'board', projectId: 'test-proj' });
  });

  it('updates route on hashchange', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useRouter());
    expect(result.current.view).toBe('overview');

    act(() => {
      window.location.hash = '#/projects/new-proj/board';
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(result.current).toEqual({ view: 'board', projectId: 'new-proj' });
  });

  it('updates from board back to overview', () => {
    window.location.hash = '#/projects/some-proj/board';
    const { result } = renderHook(() => useRouter());
    expect(result.current.view).toBe('board');

    act(() => {
      window.location.hash = '#/';
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(result.current).toEqual({ view: 'overview' });
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useRouter());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
    removeSpy.mockRestore();
  });
});

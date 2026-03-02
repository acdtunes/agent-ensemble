import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { parseHash, useRouter, type Route } from '../hooks/useRouter';

// --- Pure function tests ---

describe('parseHash', () => {
  it.each([
    ['empty string', ''],
    ['unrecognized path', '#/unknown/path'],
    ['empty project ID', '#/projects//docs'],
  ])('falls back to overview for %s', (_label, hash) => {
    expect(parseHash(hash)).toEqual({ view: 'overview' });
  });

  it('parses legacy board route', () => {
    expect(parseHash('#/projects/my-project/board')).toEqual({
      view: 'board', projectId: 'my-project',
    });
  });

  it('parses legacy docs route', () => {
    expect(parseHash('#/projects/my-project/docs')).toEqual({
      view: 'docs', projectId: 'my-project',
    });
  });

  it('parses project-only route', () => {
    expect(parseHash('#/projects/project-123')).toEqual({
      view: 'project', projectId: 'project-123',
    });
  });

  it('parses feature-board route with both IDs', () => {
    expect(parseHash('#/projects/my-project/features/feat-1/board')).toEqual({
      view: 'feature-board', projectId: 'my-project', featureId: 'feat-1',
    });
  });

  it('parses feature-docs route with both IDs', () => {
    expect(parseHash('#/projects/proj-42/features/feature-99/docs')).toEqual({
      view: 'feature-docs', projectId: 'proj-42', featureId: 'feature-99',
    });
  });

  // Intentional: incomplete feature paths fall back to project view (more user-friendly than overview)
  it.each([
    ['bare /features', '#/projects/my-project/features'],
    ['feature without sub-view', '#/projects/my-project/features/feat-1'],
  ])('falls back to project for %s', (_label, hash) => {
    expect(parseHash(hash)).toEqual({ view: 'project', projectId: 'my-project' });
  });
});

// --- Property-based tests ---

const VALID_VIEWS: readonly Route['view'][] = [
  'overview', 'project', 'board', 'docs', 'feature-board', 'feature-docs',
];

describe('parseHash properties', () => {
  it('never throws and always returns a valid Route for any string', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const route = parseHash(input);
        expect(VALID_VIEWS).toContain(route.view);
      }),
      { numRuns: 1000 },
    );
  });

  it('never throws for strings containing route-like fragments', () => {
    const hashLikeArb = fc.tuple(
      fc.constantFrom('', '#', '#/', '#/projects/', '#/projects/x/features/'),
      fc.string(),
      fc.constantFrom('', '/board', '/docs', '/features', '/unknown'),
    ).map(([prefix, middle, suffix]) => `${prefix}${middle}${suffix}`);

    fc.assert(
      fc.property(hashLikeArb, (input) => {
        const route = parseHash(input);
        expect(VALID_VIEWS).toContain(route.view);
      }),
      { numRuns: 1000 },
    );
  });
});

// --- Hook tests (integration: parseHash wired to React state) ---

describe('useRouter', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('resolves initial hash to correct route', () => {
    window.location.hash = '#/projects/test-proj/features/feat-1/board';
    const { result } = renderHook(() => useRouter());
    expect(result.current).toEqual({
      view: 'feature-board', projectId: 'test-proj', featureId: 'feat-1',
    });
  });

  it('updates route on hashchange', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useRouter());
    expect(result.current).toEqual({ view: 'overview' });

    act(() => {
      window.location.hash = '#/projects/new-proj/board';
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(result.current).toEqual({ view: 'board', projectId: 'new-proj' });
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useRouter());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
    removeSpy.mockRestore();
  });
});

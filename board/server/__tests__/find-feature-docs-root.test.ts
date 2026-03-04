/**
 * Unit tests for findFeatureDocsRoot — resolves first existing docs directory
 * for a given feature across multiple candidate directories.
 *
 * Pure function with injected dirExists predicate — no filesystem access.
 */

import { describe, it, expect } from 'vitest';
import { findFeatureDocsRoot } from '../feature-docs-root.js';

const CANDIDATE_DIRS = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;

describe('findFeatureDocsRoot', () => {
  it('returns first existing directory in priority order', () => {
    const existingDirs = new Set([
      '/project/docs/feature/auth-flow',
      '/project/docs/ux/auth-flow',
    ]);
    const dirExists = (path: string): boolean => existingDirs.has(path);

    const result = findFeatureDocsRoot('/project', 'auth-flow', CANDIDATE_DIRS, dirExists);

    expect(result).toBe('/project/docs/feature/auth-flow');
  });

  it.each([
    {
      scenario: 'only docs/ux exists',
      existing: ['/project/docs/ux/auth-flow'],
      expected: '/project/docs/ux/auth-flow',
    },
    {
      scenario: 'only docs/requirements exists',
      existing: ['/project/docs/requirements/auth-flow'],
      expected: '/project/docs/requirements/auth-flow',
    },
    {
      scenario: 'no docs directory exists',
      existing: [] as string[],
      expected: undefined,
    },
  ])('returns $expected when $scenario', ({ existing, expected }) => {
    const existingDirs = new Set(existing);
    const dirExists = (path: string): boolean => existingDirs.has(path);

    const result = findFeatureDocsRoot('/project', 'auth-flow', CANDIDATE_DIRS, dirExists);

    expect(result).toBe(expected);
  });
});

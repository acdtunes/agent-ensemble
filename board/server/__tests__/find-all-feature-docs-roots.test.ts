/**
 * Unit tests for findAllFeatureDocsRoots — resolves ALL existing docs directories
 * for a given feature across multiple candidate directories.
 *
 * Pure function with injected dirExists predicate — no filesystem access.
 */

import { describe, it, expect } from 'vitest';
import { findAllFeatureDocsRoots, type LabeledRoot } from '../feature-docs-root.js';

const CANDIDATE_DIRS = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;

describe('findAllFeatureDocsRoots', () => {
  it('returns all existing directories with proper labels', () => {
    const existingDirs = new Set([
      '/project/docs/feature/auth-flow',
      '/project/docs/ux/auth-flow',
      '/project/docs/requirements/auth-flow',
    ]);
    const dirExists = (path: string): boolean => existingDirs.has(path);

    const result = findAllFeatureDocsRoots('/project', 'auth-flow', CANDIDATE_DIRS, dirExists);

    expect(result).toEqual<LabeledRoot[]>([
      { label: 'feature', root: '/project/docs/feature/auth-flow' },
      { label: 'ux', root: '/project/docs/ux/auth-flow' },
      { label: 'requirements', root: '/project/docs/requirements/auth-flow' },
    ]);
  });

  it('returns only existing directories, preserving order', () => {
    const existingDirs = new Set([
      '/project/docs/ux/auth-flow',
      '/project/docs/requirements/auth-flow',
    ]);
    const dirExists = (path: string): boolean => existingDirs.has(path);

    const result = findAllFeatureDocsRoots('/project', 'auth-flow', CANDIDATE_DIRS, dirExists);

    expect(result).toEqual<LabeledRoot[]>([
      { label: 'ux', root: '/project/docs/ux/auth-flow' },
      { label: 'requirements', root: '/project/docs/requirements/auth-flow' },
    ]);
  });

  it('returns empty array when no directories exist', () => {
    const dirExists = (): boolean => false;

    const result = findAllFeatureDocsRoots('/project', 'auth-flow', CANDIDATE_DIRS, dirExists);

    expect(result).toEqual([]);
  });

  it('derives label from last segment of candidate directory path', () => {
    const customDirs = ['docs/custom/special-category', 'docs/other'] as const;
    const existingDirs = new Set([
      '/project/docs/custom/special-category/my-feature',
      '/project/docs/other/my-feature',
    ]);
    const dirExists = (path: string): boolean => existingDirs.has(path);

    const result = findAllFeatureDocsRoots('/project', 'my-feature', customDirs, dirExists);

    expect(result).toEqual<LabeledRoot[]>([
      { label: 'special-category', root: '/project/docs/custom/special-category/my-feature' },
      { label: 'other', root: '/project/docs/other/my-feature' },
    ]);
  });
});

/**
 * Archive Path Resolver — pure function tests
 *
 * Validates: resolveArchiveDir produces absolute path to docs/archive/{featureId}.
 * All functions are pure — no filesystem access needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createFeatureId } from '../../shared/types.js';
import { resolveArchiveDir } from '../archive-path-resolver.js';

describe('resolveArchiveDir: produces absolute path to archive directory', () => {
  it('joins projectPath with docs/archive/{featureId}', () => {
    const featureId = createFeatureId('auth-system');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveArchiveDir('/home/user/project', featureId.value);
    expect(result).toBe('/home/user/project/docs/archive/auth-system');
  });

  it('handles project paths with trailing content', () => {
    const featureId = createFeatureId('user-profile');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveArchiveDir('/projects/my-app', featureId.value);
    expect(result).toBe('/projects/my-app/docs/archive/user-profile');
  });

  // Property: result always starts with projectPath and ends with featureId
  it('property: result contains projectPath prefix and featureId suffix', () => {
    const projectPath = fc.stringMatching(/^\/[a-z][a-z0-9/]*$/);
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

    fc.assert(
      fc.property(projectPath, featureSlug, (path, slug) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true; // skip invalid
        const result = resolveArchiveDir(path, fid.value);
        return result.startsWith(path + '/') && result.endsWith(slug);
      }),
    );
  });

  // Property: archive path always contains /docs/archive/ segment
  it('property: result always contains /docs/archive/ segment', () => {
    const projectPath = fc.stringMatching(/^\/[a-z][a-z0-9/]*$/);
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

    fc.assert(
      fc.property(projectPath, featureSlug, (path, slug) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true; // skip invalid
        const result = resolveArchiveDir(path, fid.value);
        return result.includes('/docs/archive/');
      }),
    );
  });

  // Property: archive path structure is deterministic
  it('property: same inputs always produce same output (referential transparency)', () => {
    const projectPath = fc.stringMatching(/^\/[a-z][a-z0-9/]*$/);
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

    fc.assert(
      fc.property(projectPath, featureSlug, (path, slug) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true;
        const result1 = resolveArchiveDir(path, fid.value);
        const result2 = resolveArchiveDir(path, fid.value);
        return result1 === result2;
      }),
    );
  });
});

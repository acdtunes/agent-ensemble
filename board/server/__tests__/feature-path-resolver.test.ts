/**
 * Feature Path Resolver — pure function tests
 *
 * Validates: FeatureId branded type, path resolution from projectPath + featureId.
 * All functions are pure — no filesystem access needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createFeatureId } from '../../shared/types.js';
import {
  resolveFeatureDir,
  resolveFeatureRoadmap,
  resolveFeatureExecutionLog,
  resolveFeatureDocsRoot,
} from '../feature-path-resolver.js';

// --- FeatureId creation tests ---

describe('createFeatureId: validates lowercase slug format', () => {
  it('accepts valid lowercase slugs', () => {
    const validSlugs = ['auth', 'multi-project', 'card-redesign', 'a1b2', 'feature-123-abc'];
    for (const slug of validSlugs) {
      const result = createFeatureId(slug);
      expect(result.ok).toBe(true);
    }
  });

  it('rejects leading hyphens', () => {
    const result = createFeatureId('-auth');
    expect(result.ok).toBe(false);
  });

  it('rejects trailing hyphens', () => {
    const result = createFeatureId('auth-');
    expect(result.ok).toBe(false);
  });

  it('rejects uppercase characters', () => {
    const result = createFeatureId('Auth');
    expect(result.ok).toBe(false);
  });

  it('rejects empty string', () => {
    const result = createFeatureId('');
    expect(result.ok).toBe(false);
  });

  // Property: any valid slug round-trips through createFeatureId
  it('property: valid lowercase slugs always succeed', () => {
    const validSlug = fc.stringMatching(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
    fc.assert(
      fc.property(validSlug, (slug) => {
        const result = createFeatureId(slug);
        return result.ok === true;
      }),
    );
  });

  // Property: slugs with leading/trailing hyphens always fail
  it('property: leading or trailing hyphens always rejected', () => {
    const badSlug = fc.oneof(
      fc.stringMatching(/^-[a-z0-9]+$/),
      fc.stringMatching(/^[a-z0-9]+-$/),
    );
    fc.assert(
      fc.property(badSlug, (slug) => {
        const result = createFeatureId(slug);
        return result.ok === false;
      }),
    );
  });
});

// --- Path resolver tests ---

describe('resolveFeatureDir: produces absolute path to feature directory', () => {
  it('joins projectPath with docs/feature/{featureId}', () => {
    const featureId = createFeatureId('card-redesign');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveFeatureDir('/home/user/project', featureId.value);
    expect(result).toBe('/home/user/project/docs/feature/card-redesign');
  });

  // Property: result always starts with projectPath and ends with featureId
  it('property: result contains projectPath prefix and featureId suffix', () => {
    const projectPath = fc.stringMatching(/^\/[a-z][a-z0-9/]*$/);
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

    fc.assert(
      fc.property(projectPath, featureSlug, (path, slug) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true; // skip invalid
        const result = resolveFeatureDir(path, fid.value);
        return result.startsWith(path + '/') && result.endsWith(slug);
      }),
    );
  });
});

describe('resolveFeatureRoadmap: produces path to roadmap.yaml', () => {
  it('appends roadmap.yaml to feature directory', () => {
    const featureId = createFeatureId('multi-project');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveFeatureRoadmap('/proj', featureId.value);
    expect(result).toBe('/proj/docs/feature/multi-project/roadmap.yaml');
  });
});

describe('resolveFeatureExecutionLog: produces path to execution-log.yaml', () => {
  it('appends execution-log.yaml to feature directory', () => {
    const featureId = createFeatureId('auth');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveFeatureExecutionLog('/proj', featureId.value);
    expect(result).toBe('/proj/docs/feature/auth/execution-log.yaml');
  });
});

describe('resolveFeatureDocsRoot: produces path to feature docs root', () => {
  it('returns feature directory as docs root', () => {
    const featureId = createFeatureId('doc-viewer');
    if (!featureId.ok) throw new Error('Fixture failed');

    const result = resolveFeatureDocsRoot('/proj', featureId.value);
    expect(result).toBe('/proj/docs/feature/doc-viewer');
  });

  // Property: all resolvers are consistent — roadmap and executionLog extend dir
  it('property: roadmap and executionLog paths are within feature dir', () => {
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

    fc.assert(
      fc.property(featureSlug, (slug) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true;
        const dir = resolveFeatureDir('/base', fid.value);
        const roadmap = resolveFeatureRoadmap('/base', fid.value);
        const execLog = resolveFeatureExecutionLog('/base', fid.value);
        return roadmap.startsWith(dir + '/') && execLog.startsWith(dir + '/');
      }),
    );
  });
});

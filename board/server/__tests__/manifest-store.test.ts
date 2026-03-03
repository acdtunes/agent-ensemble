/**
 * Manifest Store — pure function tests
 *
 * Driving port: validateManifest, addEntry, removeEntry, findDuplicate
 * Validates: manifest validation, immutable add/remove, duplicate detection
 *
 * These are pure function tests — no I/O, no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ProjectManifest, ManifestEntry, FeatureId, ProjectId } from '../../shared/types.js';
import { ok, err, createFeatureId, createProjectId } from '../../shared/types.js';
import {
  validateManifest,
  addEntry,
  removeEntry,
  findDuplicate,
} from '../manifest-store.js';

// --- Test helpers ---

const makeProjectId = (raw: string): ProjectId => {
  const result = createProjectId(raw);
  if (!result.ok) throw new Error(`Invalid test project ID: ${raw}`);
  return result.value;
};

const makeFeatureId = (raw: string): FeatureId => {
  const result = createFeatureId(raw);
  if (!result.ok) throw new Error(`Invalid test feature ID: ${raw}`);
  return result.value;
};

const makeEntry = (featureId: string): ManifestEntry => ({
  featureId: makeFeatureId(featureId),
  name: `Feature ${featureId}`,
  roadmapPath: `docs/feature/${featureId}/roadmap.yaml`,
  executionLogPath: `docs/feature/${featureId}/execution-log.yaml`,
  docsRoot: `docs/feature/${featureId}`,
});

const makeManifest = (projectId: string, entries: ManifestEntry[] = []): ProjectManifest => ({
  projectId: makeProjectId(projectId),
  features: entries,
});

// --- Generators for property-based tests ---

const featureSlugArb = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);

const featureIdArb = featureSlugArb.map((slug) => {
  const result = createFeatureId(slug);
  if (!result.ok) throw new Error(`Generator produced invalid feature ID: ${slug}`);
  return result.value;
});

const entryArb = featureIdArb.map((fid): ManifestEntry => ({
  featureId: fid,
  name: `Feature ${fid}`,
  roadmapPath: `docs/feature/${fid}/roadmap.yaml`,
  executionLogPath: `docs/feature/${fid}/execution-log.yaml`,
  docsRoot: `docs/feature/${fid}`,
}));

const PROJECT_ID = makeProjectId('test-project');

const manifestArb = fc.array(entryArb, { maxLength: 10 })
  .map((entries): ProjectManifest => {
    // Deduplicate by featureId to ensure valid manifests
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      if (seen.has(e.featureId as string)) return false;
      seen.add(e.featureId as string);
      return true;
    });
    return { projectId: PROJECT_ID, features: unique };
  });

// =================================================================
// Acceptance: full manifest lifecycle
// =================================================================
describe('Manifest store: full lifecycle (validate → add → find → remove)', () => {
  it('validates raw data, adds entries, detects duplicates, removes entries', () => {
    // Given a valid raw manifest object
    const rawManifest = {
      projectId: 'my-project',
      features: [],
    };

    // When validated
    const validated = validateManifest(rawManifest);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    // Then we can add an entry
    const entry = makeEntry('auth');
    const afterAdd = addEntry(validated.value, entry);
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;
    expect(afterAdd.value.features).toHaveLength(1);

    // And detect a duplicate
    const duplicate = findDuplicate(afterAdd.value, makeFeatureId('auth'));
    expect(duplicate).toBeDefined();
    expect(duplicate?.featureId).toBe(entry.featureId);

    // And adding the same entry again fails
    const dupAdd = addEntry(afterAdd.value, entry);
    expect(dupAdd.ok).toBe(false);
    if (dupAdd.ok) return;
    expect(dupAdd.error.type).toBe('duplicate_entry');

    // And we can remove the entry
    const afterRemove = removeEntry(afterAdd.value, makeFeatureId('auth'));
    expect(afterRemove.ok).toBe(true);
    if (!afterRemove.ok) return;
    expect(afterRemove.value.features).toHaveLength(0);

    // And the duplicate is no longer found
    expect(findDuplicate(afterRemove.value, makeFeatureId('auth'))).toBeUndefined();
  });
});

// =================================================================
// validateManifest: rejects malformed data with descriptive error
// =================================================================
describe('validateManifest: rejects malformed data with descriptive error', () => {
  it('accepts a valid manifest with empty features', () => {
    const result = validateManifest({ projectId: 'valid-project', features: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.features).toEqual([]);
  });

  it('accepts a valid manifest with features', () => {
    const result = validateManifest({
      projectId: 'valid-project',
      features: [{
        featureId: 'auth',
        name: 'Authentication',
        roadmapPath: 'docs/feature/auth/roadmap.yaml',
        executionLogPath: 'docs/feature/auth/execution-log.yaml',
        docsRoot: 'docs/feature/auth',
      }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.features).toHaveLength(1);
  });

  it('rejects null', () => {
    const result = validateManifest(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
  });

  it('rejects undefined', () => {
    const result = validateManifest(undefined);
    expect(result.ok).toBe(false);
  });

  it('rejects non-object', () => {
    const result = validateManifest('string');
    expect(result.ok).toBe(false);
  });

  it('rejects missing projectId', () => {
    const result = validateManifest({ features: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('projectId');
  });

  it('rejects invalid projectId format', () => {
    const result = validateManifest({ projectId: 'INVALID', features: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('projectId');
  });

  it('rejects missing features', () => {
    const result = validateManifest({ projectId: 'valid-project' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('features');
  });

  it('rejects non-array features', () => {
    const result = validateManifest({ projectId: 'valid-project', features: 'not-array' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('features');
  });

  it('rejects feature entry with missing featureId', () => {
    const result = validateManifest({
      projectId: 'valid-project',
      features: [{ name: 'Auth', roadmapPath: 'p', executionLogPath: 'p', docsRoot: 'p' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('featureId');
  });

  it('rejects feature entry with invalid featureId format', () => {
    const result = validateManifest({
      projectId: 'valid-project',
      features: [{ featureId: 'BAD-ID', name: 'Auth', roadmapPath: 'p', executionLogPath: 'p', docsRoot: 'p' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('featureId');
  });

  it('rejects feature entry with missing required fields', () => {
    const result = validateManifest({
      projectId: 'valid-project',
      features: [{ featureId: 'auth' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toMatch(/name|roadmapPath|executionLogPath|docsRoot/);
  });

  it('rejects duplicate featureIds within features array', () => {
    const result = validateManifest({
      projectId: 'valid-project',
      features: [
        { featureId: 'auth', name: 'Auth 1', roadmapPath: 'p1', executionLogPath: 'p1', docsRoot: 'p1' },
        { featureId: 'auth', name: 'Auth 2', roadmapPath: 'p2', executionLogPath: 'p2', docsRoot: 'p2' },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
    if (result.error.type !== 'invalid_manifest') return;
    expect(result.error.message).toContain('duplicate');
  });

  // Property: any non-object always rejected
  it('property: non-objects always rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (input) => {
          const result = validateManifest(input);
          return result.ok === false;
        },
      ),
    );
  });
});

// =================================================================
// addEntry: returns new manifest with entry appended (immutable)
// =================================================================
describe('addEntry: returns new manifest with entry appended', () => {
  it('does not mutate the original manifest', () => {
    const manifest = makeManifest('my-project', [makeEntry('auth')]);
    const original = manifest.features;

    addEntry(manifest, makeEntry('dashboard'));

    expect(manifest.features).toBe(original);
    expect(manifest.features).toHaveLength(1);
  });

  it('rejects duplicate featureId', () => {
    const manifest = makeManifest('my-project', [makeEntry('auth')]);

    const result = addEntry(manifest, makeEntry('auth'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('duplicate_entry');
    if (result.error.type !== 'duplicate_entry') return;
    expect(result.error.featureId).toBe(makeFeatureId('auth'));
  });

  // Property: addEntry increases feature count by exactly 1
  it('property: addEntry increases feature count by exactly 1', () => {
    fc.assert(
      fc.property(manifestArb, entryArb, (manifest, entry) => {
        // Ensure no duplicate
        if (findDuplicate(manifest, entry.featureId)) return true; // skip
        const result = addEntry(manifest, entry);
        if (!result.ok) return false;
        return result.value.features.length === manifest.features.length + 1;
      }),
    );
  });

  // Property: added entry is findable via findDuplicate
  it('property: added entry is always findable', () => {
    fc.assert(
      fc.property(manifestArb, entryArb, (manifest, entry) => {
        if (findDuplicate(manifest, entry.featureId)) return true; // skip
        const result = addEntry(manifest, entry);
        if (!result.ok) return false;
        return findDuplicate(result.value, entry.featureId) !== undefined;
      }),
    );
  });

  // Property: addEntry preserves all existing entries
  it('property: addEntry preserves all existing entries', () => {
    fc.assert(
      fc.property(manifestArb, entryArb, (manifest, entry) => {
        if (findDuplicate(manifest, entry.featureId)) return true;
        const result = addEntry(manifest, entry);
        if (!result.ok) return false;
        return manifest.features.every((existing) =>
          findDuplicate(result.value, existing.featureId) !== undefined,
        );
      }),
    );
  });
});

// =================================================================
// removeEntry: returns new manifest without target entry
// =================================================================
describe('removeEntry: returns new manifest without target entry', () => {
  it('returns entry_not_found for missing featureId', () => {
    const manifest = makeManifest('my-project', [makeEntry('auth')]);

    const result = removeEntry(manifest, makeFeatureId('nonexistent'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('entry_not_found');
    if (result.error.type !== 'entry_not_found') return;
    expect(result.error.featureId).toBe(makeFeatureId('nonexistent'));
  });

  it('preserves projectId in the returned manifest', () => {
    const manifest = makeManifest('my-project', [makeEntry('auth')]);
    const result = removeEntry(manifest, makeFeatureId('auth'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectId).toBe(manifest.projectId);
  });

  // Property: removeEntry decreases feature count by exactly 1
  it('property: removeEntry decreases feature count by exactly 1', () => {
    fc.assert(
      fc.property(
        manifestArb.filter((m) => m.features.length > 0),
        (manifest) => {
          const targetId = manifest.features[0].featureId;
          const result = removeEntry(manifest, targetId);
          if (!result.ok) return false;
          return result.value.features.length === manifest.features.length - 1;
        },
      ),
    );
  });

  // Property: removed entry is no longer findable
  it('property: removed entry is no longer findable', () => {
    fc.assert(
      fc.property(
        manifestArb.filter((m) => m.features.length > 0),
        (manifest) => {
          const targetId = manifest.features[0].featureId;
          const result = removeEntry(manifest, targetId);
          if (!result.ok) return false;
          return findDuplicate(result.value, targetId) === undefined;
        },
      ),
    );
  });

  // Property: add then remove is identity (roundtrip)
  it('property: add then remove preserves original features', () => {
    fc.assert(
      fc.property(manifestArb, entryArb, (manifest, entry) => {
        if (findDuplicate(manifest, entry.featureId)) return true;
        const added = addEntry(manifest, entry);
        if (!added.ok) return false;
        const removed = removeEntry(added.value, entry.featureId);
        if (!removed.ok) return false;
        // Same number of features as original
        return removed.value.features.length === manifest.features.length;
      }),
    );
  });
});

// =================================================================
// findDuplicate: detects existing featureId in manifest
// =================================================================
describe('findDuplicate: detects existing featureId in manifest', () => {
  it('finds existing entry by featureId', () => {
    const entry = makeEntry('auth');
    const manifest = makeManifest('my-project', [entry]);

    const found = findDuplicate(manifest, makeFeatureId('auth'));

    expect(found).toBeDefined();
    expect(found?.featureId).toBe(entry.featureId);
    expect(found?.name).toBe(entry.name);
  });

  it('returns undefined for missing featureId', () => {
    const manifest = makeManifest('my-project', [makeEntry('auth')]);

    const found = findDuplicate(manifest, makeFeatureId('nonexistent'));

    expect(found).toBeUndefined();
  });

  it('returns undefined for empty manifest', () => {
    const manifest = makeManifest('my-project');

    const found = findDuplicate(manifest, makeFeatureId('auth'));

    expect(found).toBeUndefined();
  });

  // Property: every entry in manifest is findable
  it('property: every entry in manifest is findable', () => {
    fc.assert(
      fc.property(manifestArb, (manifest) => {
        return manifest.features.every((entry) =>
          findDuplicate(manifest, entry.featureId) !== undefined,
        );
      }),
    );
  });
});

/**
 * Feature discovery — pure function tests (unified roadmap)
 *
 * Validates: deriveFeatureSummary computes FeatureSummary from optional Roadmap,
 * isFeatureDir filters valid directory names.
 * All functions are pure — no filesystem access needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { FeatureId, Roadmap } from '../../shared/types.js';
import { createFeatureId } from '../../shared/types.js';
import { deriveFeatureSummary, isFeatureDir } from '../feature-discovery.js';

// --- Helpers ---

const makeFeatureId = (raw: string): FeatureId => {
  const result = createFeatureId(raw);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

const minimalRoadmap: Roadmap = {
  roadmap: {
    project_id: 'test-project',
    created_at: '2026-01-01T00:00:00Z',
    total_steps: 3,
    phases: 2,
  },
  phases: [
    {
      id: '01',
      name: 'Phase 1',
      steps: [
        {
          id: '01-01', name: 'Step A',
          files_to_modify: ['a.ts'], dependencies: [], criteria: ['AC1'],
          status: 'approved', teammate_id: 'crafter-1',
          started_at: '2026-01-01T01:00:00Z', completed_at: '2026-01-01T02:00:00Z',
          review_attempts: 1,
        },
        {
          id: '01-02', name: 'Step B',
          files_to_modify: ['b.ts'], dependencies: ['01-01'], criteria: ['AC2'],
          status: 'in_progress', teammate_id: 'crafter-2',
          started_at: '2026-01-01T03:00:00Z', completed_at: null,
          review_attempts: 0,
        },
      ],
    },
    {
      id: '02',
      name: 'Phase 2',
      steps: [
        {
          id: '02-01', name: 'Step C',
          files_to_modify: ['c.ts'], dependencies: [], criteria: ['AC3'],
          status: 'pending', teammate_id: null,
          started_at: null, completed_at: null,
          review_attempts: 0,
        },
      ],
    },
  ],
};

const allPendingRoadmap: Roadmap = {
  roadmap: { project_id: 'pending-project', total_steps: 2, phases: 1 },
  phases: [{
    id: '01', name: 'Phase 1',
    steps: [
      {
        id: '01-01', name: 'Step A', files_to_modify: [], dependencies: [], criteria: [],
        status: 'pending', teammate_id: null, started_at: null, completed_at: null, review_attempts: 0,
      },
      {
        id: '01-02', name: 'Step B', files_to_modify: [], dependencies: [], criteria: [],
        status: 'pending', teammate_id: null, started_at: null, completed_at: null, review_attempts: 0,
      },
    ],
  }],
};

const phaseOneCompleteRoadmap: Roadmap = {
  roadmap: { project_id: 'test', total_steps: 2, phases: 2 },
  phases: [
    {
      id: '01', name: 'Phase 1',
      steps: [{
        id: '01-01', name: 'Step A', files_to_modify: [], dependencies: [], criteria: [],
        status: 'approved', teammate_id: 'c-1',
        started_at: '2026-01-01T01:00:00Z', completed_at: '2026-01-01T02:00:00Z', review_attempts: 1,
      }],
    },
    {
      id: '02', name: 'Phase 2',
      steps: [{
        id: '02-01', name: 'Step B', files_to_modify: [], dependencies: [], criteria: [],
        status: 'in_progress', teammate_id: 'c-2',
        started_at: '2026-01-01T03:00:00Z', completed_at: null, review_attempts: 0,
      }],
    },
  ],
};

// --- Acceptance: deriveFeatureSummary ---

describe('deriveFeatureSummary: computes FeatureSummary from Roadmap', () => {
  const featureId = makeFeatureId('card-redesign');

  it('with roadmap produces correct metrics from step statuses', () => {
    const summary = deriveFeatureSummary(featureId, minimalRoadmap);

    expect(summary.featureId).toBe(featureId);
    expect(summary.name).toBe('card-redesign');
    expect(summary.hasRoadmap).toBe(true);
    expect(summary.hasExecutionLog).toBe(true);
    expect(summary.totalSteps).toBe(3);
    expect(summary.completed).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.currentLayer).toBe(0);
    expect(summary.updatedAt).toBe('2026-01-01T03:00:00Z');
  });

  it('with null roadmap returns all-zero summary', () => {
    const summary = deriveFeatureSummary(featureId, null);

    expect(summary.featureId).toBe(featureId);
    expect(summary.name).toBe('card-redesign');
    expect(summary.hasRoadmap).toBe(false);
    expect(summary.hasExecutionLog).toBe(false);
    expect(summary.totalSteps).toBe(0);
    expect(summary.completed).toBe(0);
    expect(summary.inProgress).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.currentLayer).toBe(0);
    expect(summary.updatedAt).toBe('');
  });

  it('with all-pending roadmap shows hasExecutionLog false', () => {
    const summary = deriveFeatureSummary(featureId, allPendingRoadmap);

    expect(summary.hasRoadmap).toBe(true);
    expect(summary.hasExecutionLog).toBe(false);
    expect(summary.totalSteps).toBe(2);
    expect(summary.completed).toBe(0);
    expect(summary.inProgress).toBe(0);
  });

  it('with fully completed phase shows currentLayer reflecting completed phases', () => {
    const summary = deriveFeatureSummary(featureId, phaseOneCompleteRoadmap);

    expect(summary.currentLayer).toBe(1);
    expect(summary.hasExecutionLog).toBe(true);
  });

  // Property: totalSteps is always non-negative
  it('property: totalSteps is always non-negative', () => {
    const optionalRoadmap = fc.constantFrom(minimalRoadmap, allPendingRoadmap, null);

    fc.assert(
      fc.property(optionalRoadmap, (roadmap) => {
        const summary = deriveFeatureSummary(featureId, roadmap);
        return summary.totalSteps >= 0;
      }),
    );
  });

  // Property: completed + inProgress + failed <= totalSteps
  it('property: completed + inProgress + failed <= totalSteps', () => {
    const optionalRoadmap = fc.constantFrom(minimalRoadmap, allPendingRoadmap, phaseOneCompleteRoadmap, null);

    fc.assert(
      fc.property(optionalRoadmap, (roadmap) => {
        const summary = deriveFeatureSummary(featureId, roadmap);
        return summary.completed + summary.inProgress + summary.failed <= summary.totalSteps;
      }),
    );
  });

  // Property: hasRoadmap reflects roadmap presence
  it('property: hasRoadmap reflects roadmap presence', () => {
    const optionalRoadmap = fc.constantFrom(minimalRoadmap, allPendingRoadmap, null);

    fc.assert(
      fc.property(optionalRoadmap, (roadmap) => {
        const summary = deriveFeatureSummary(featureId, roadmap);
        return summary.hasRoadmap === (roadmap !== null);
      }),
    );
  });
});

// --- Acceptance + Unit: isFeatureDir ---

describe('isFeatureDir: filters valid directory names', () => {
  it('accepts valid lowercase slugs', () => {
    const validNames = ['auth', 'multi-project', 'card-redesign', 'a1b2', 'feature-123-abc'];
    for (const name of validNames) {
      expect(isFeatureDir(name)).toBe(true);
    }
  });

  it.each(['.hidden', '.git', 'Auth', 'FEATURE', '-auth', 'auth-', ''])(
    'rejects invalid name: %s',
    (name) => expect(isFeatureDir(name)).toBe(false),
  );

  // Property: isFeatureDir is consistent with createFeatureId
  it('property: isFeatureDir agrees with createFeatureId', () => {
    const anyName = fc.string({ minLength: 0, maxLength: 30 });

    fc.assert(
      fc.property(anyName, (name) => {
        const dirResult = isFeatureDir(name);
        const idResult = createFeatureId(name).ok;
        return dirResult === idResult;
      }),
    );
  });

  // Property: valid slugs always accepted
  it('property: valid lowercase slugs always accepted', () => {
    const validSlug = fc.stringMatching(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

    fc.assert(
      fc.property(validSlug, (slug) => {
        return isFeatureDir(slug) === true;
      }),
    );
  });
});

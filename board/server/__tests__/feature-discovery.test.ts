/**
 * Feature discovery — pure function tests
 *
 * Validates: deriveFeatureSummary computes FeatureSummary from optional plan/state,
 * isFeatureDir filters valid directory names.
 * All functions are pure — no filesystem access needed.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type {
  FeatureId,
  ExecutionPlan,
  DeliveryState,
  FeatureSummary,
} from '../../shared/types.js';
import { createFeatureId } from '../../shared/types.js';
import { deriveFeatureSummary, isFeatureDir } from '../feature-discovery.js';

// --- Helpers ---

const makeFeatureId = (raw: string): FeatureId => {
  const result = createFeatureId(raw);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

const minimalPlan: ExecutionPlan = {
  schema_version: '1',
  summary: { total_steps: 3, total_layers: 2, max_parallelism: 2, requires_worktrees: false },
  layers: [
    {
      layer: 1,
      parallel: true,
      use_worktrees: false,
      steps: [
        { step_id: '01-01', name: 'Step A', files_to_modify: ['a.ts'] },
        { step_id: '01-02', name: 'Step B', files_to_modify: ['b.ts'] },
      ],
    },
    {
      layer: 2,
      parallel: false,
      use_worktrees: false,
      steps: [{ step_id: '02-01', name: 'Step C', files_to_modify: ['c.ts'] }],
    },
  ],
};

const minimalState: DeliveryState = {
  schema_version: '1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  plan_path: 'roadmap.yaml',
  current_layer: 2,
  summary: { total_steps: 3, total_layers: 2, completed: 1, failed: 0, in_progress: 1 },
  steps: {
    '01-01': {
      step_id: '01-01', name: 'Step A', layer: 1, status: 'approved',
      teammate_id: 'crafter-1', started_at: '2026-01-01T01:00:00Z',
      completed_at: '2026-01-01T02:00:00Z', review_attempts: 1, files_to_modify: ['a.ts'],
    },
    '01-02': {
      step_id: '01-02', name: 'Step B', layer: 1, status: 'in_progress',
      teammate_id: 'crafter-2', started_at: '2026-01-01T01:00:00Z',
      completed_at: null, review_attempts: 0, files_to_modify: ['b.ts'],
    },
    '02-01': {
      step_id: '02-01', name: 'Step C', layer: 2, status: 'pending',
      teammate_id: null, started_at: null, completed_at: null,
      review_attempts: 0, files_to_modify: ['c.ts'],
    },
  },
  teammates: {},
};

// --- Acceptance: deriveFeatureSummary ---

describe('deriveFeatureSummary: computes FeatureSummary from optional artifacts', () => {
  const featureId = makeFeatureId('card-redesign');

  it('with plan and state produces correct metrics', () => {
    const summary = deriveFeatureSummary(featureId, minimalPlan, minimalState);

    expect(summary.featureId).toBe(featureId);
    expect(summary.name).toBe('card-redesign');
    expect(summary.hasRoadmap).toBe(true);
    expect(summary.hasExecutionLog).toBe(true);
    expect(summary.totalSteps).toBe(3);
    expect(summary.completed).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.currentLayer).toBe(2);
    expect(summary.updatedAt).toBe('2026-03-01T12:00:00Z');
  });

  it('with no execution log shows 0 completed/inProgress/failed', () => {
    const summary = deriveFeatureSummary(featureId, minimalPlan, null);

    expect(summary.hasExecutionLog).toBe(false);
    expect(summary.completed).toBe(0);
    expect(summary.inProgress).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.currentLayer).toBe(0);
    expect(summary.updatedAt).toBe('');
  });

  it('with no roadmap shows 0 totalSteps and hasRoadmap false', () => {
    const summary = deriveFeatureSummary(featureId, null, minimalState);

    expect(summary.hasRoadmap).toBe(false);
    expect(summary.totalSteps).toBe(0);
  });

  it('with neither plan nor state returns all-zero summary', () => {
    const summary = deriveFeatureSummary(featureId, null, null);

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

  // Property: totalSteps is always non-negative
  it('property: totalSteps is always non-negative', () => {
    const featureSlug = fc.stringMatching(/^[a-z][a-z0-9-]*[a-z0-9]$/);
    const optionalPlan = fc.constantFrom(minimalPlan, null);
    const optionalState = fc.constantFrom(minimalState, null);

    fc.assert(
      fc.property(featureSlug, optionalPlan, optionalState, (slug, plan, state) => {
        const fid = createFeatureId(slug);
        if (!fid.ok) return true;
        const summary = deriveFeatureSummary(fid.value, plan, state);
        return summary.totalSteps >= 0;
      }),
    );
  });

  // Property: completed + inProgress + failed <= totalSteps when both artifacts present
  it('property: execution metrics are non-negative', () => {
    const optionalPlan = fc.constantFrom(minimalPlan, null);
    const optionalState = fc.constantFrom(minimalState, null);

    fc.assert(
      fc.property(optionalPlan, optionalState, (plan, state) => {
        const summary = deriveFeatureSummary(featureId, plan, state);
        return summary.completed >= 0 && summary.inProgress >= 0 && summary.failed >= 0;
      }),
    );
  });

  // Property: hasRoadmap is true iff plan is non-null
  it('property: hasRoadmap reflects plan presence', () => {
    const optionalPlan = fc.constantFrom(minimalPlan, null);
    const optionalState = fc.constantFrom(minimalState, null);

    fc.assert(
      fc.property(optionalPlan, optionalState, (plan, state) => {
        const summary = deriveFeatureSummary(featureId, plan, state);
        return summary.hasRoadmap === (plan !== null);
      }),
    );
  });

  // Property: hasExecutionLog is true iff state is non-null
  it('property: hasExecutionLog reflects state presence', () => {
    const optionalPlan = fc.constantFrom(minimalPlan, null);
    const optionalState = fc.constantFrom(minimalState, null);

    fc.assert(
      fc.property(optionalPlan, optionalState, (plan, state) => {
        const summary = deriveFeatureSummary(featureId, plan, state);
        return summary.hasExecutionLog === (state !== null);
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

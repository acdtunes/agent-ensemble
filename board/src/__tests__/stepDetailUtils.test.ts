import { describe, it, expect } from 'vitest';
import type { ExecutionPlan } from '../../shared/types';
import { buildPlanStepLookup, computeDuration } from '../utils/stepDetailUtils';

describe('buildPlanStepLookup', () => {
  it('builds a Map keyed by step_id from all layers', () => {
    const plan: ExecutionPlan = {
      schema_version: '1.0',
      summary: { total_steps: 3, total_layers: 2, max_parallelism: 2, requires_worktrees: false },
      layers: [
        {
          layer: 1, parallel: true, use_worktrees: false,
          steps: [
            { step_id: '01-01', name: 'Step A', files_to_modify: ['a.ts'] },
            { step_id: '01-02', name: 'Step B', files_to_modify: ['b.ts'] },
          ],
        },
        {
          layer: 2, parallel: false, use_worktrees: false,
          steps: [
            { step_id: '02-01', name: 'Step C', files_to_modify: ['c.ts'] },
          ],
        },
      ],
    };

    const lookup = buildPlanStepLookup(plan);

    expect(lookup.size).toBe(3);
    expect(lookup.get('01-01')?.name).toBe('Step A');
    expect(lookup.get('01-02')?.name).toBe('Step B');
    expect(lookup.get('02-01')?.name).toBe('Step C');
  });

  it('returns empty Map for plan with no layers', () => {
    const plan: ExecutionPlan = {
      schema_version: '1.0',
      summary: { total_steps: 0, total_layers: 0, max_parallelism: 0, requires_worktrees: false },
      layers: [],
    };

    expect(buildPlanStepLookup(plan).size).toBe(0);
  });
});

describe('computeDuration', () => {
  it('returns formatted duration when both timestamps present', () => {
    const result = computeDuration('2026-01-01T00:10:00Z', '2026-01-01T00:30:00Z');
    expect(result).toBe('20m');
  });

  it('returns null when started_at is null', () => {
    expect(computeDuration(null, '2026-01-01T00:30:00Z')).toBeNull();
  });

  it('returns null when completed_at is null', () => {
    expect(computeDuration('2026-01-01T00:10:00Z', null)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(computeDuration(null, null)).toBeNull();
  });

  it('formats hours and minutes for longer durations', () => {
    const result = computeDuration('2026-01-01T00:00:00Z', '2026-01-01T02:15:00Z');
    expect(result).toBe('2h 15m');
  });

  it('shows only minutes for sub-hour durations', () => {
    const result = computeDuration('2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z');
    expect(result).toBe('5m');
  });
});

import { describe, it, expect } from 'vitest';
import type { Roadmap, RoadmapStep } from '../../shared/types';
import { buildPlanStepLookup, computeDuration } from '../utils/stepDetailUtils';

const makeStep = (id: string, name: string): RoadmapStep => ({
  id,
  name,
  description: '',
  files_to_modify: [],
  dependencies: [],
  criteria: [],
  status: 'pending',
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
});

describe('buildPlanStepLookup', () => {
  it('builds a Map keyed by step id from all phases', () => {
    const roadmap: Roadmap = {
      roadmap: { project_id: 'test', created_at: '2026-01-01T00:00:00Z', total_steps: 3, phases: 2 },
      phases: [
        {
          id: '01',
          name: 'Phase 1',
          steps: [makeStep('01-01', 'Step A'), makeStep('01-02', 'Step B')],
        },
        {
          id: '02',
          name: 'Phase 2',
          steps: [makeStep('02-01', 'Step C')],
        },
      ],
    };

    const lookup = buildPlanStepLookup(roadmap);

    expect(lookup.size).toBe(3);
    expect(lookup.get('01-01')?.name).toBe('Step A');
    expect(lookup.get('01-02')?.name).toBe('Step B');
    expect(lookup.get('02-01')?.name).toBe('Step C');
  });

  it('returns empty Map for roadmap with no phases', () => {
    const roadmap: Roadmap = {
      roadmap: { project_id: 'test', created_at: '2026-01-01T00:00:00Z', total_steps: 0, phases: 0 },
      phases: [],
    };

    expect(buildPlanStepLookup(roadmap).size).toBe(0);
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

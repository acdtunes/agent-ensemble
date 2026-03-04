import { describe, it, expect } from 'vitest';
import { computeTransitions } from '../differ.js';
import type { Roadmap, RoadmapStep, RoadmapTransition } from '../../shared/types.js';

// --- Fixtures ---

const makeStep = (overrides: Partial<RoadmapStep> & Pick<RoadmapStep, 'id' | 'status'>): RoadmapStep => ({
  name: overrides.id,
  files_to_modify: [],
  dependencies: [],
  criteria: [],
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

const makeRoadmap = (steps: readonly RoadmapStep[]): Roadmap => ({
  roadmap: { project_id: 'test', created_at: '2026-03-01T00:00:00Z' },
  phases: [{
    id: '01',
    name: 'Phase 1',
    steps,
  }],
});

const NOW = '2026-03-01T01:00:00Z';

describe('computeTransitions', () => {
  it('should return empty list when roadmap is unchanged', () => {
    const roadmap = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
    ]);

    const transitions = computeTransitions(roadmap, roadmap, NOW);

    expect(transitions).toEqual([]);
  });

  it('should produce transition when step status changes', () => {
    const previous = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
    ]);
    const current = makeRoadmap([
      makeStep({ id: '01-01', status: 'in_progress', teammate_id: 'crafter-01' }),
    ]);

    const transitions = computeTransitions(previous, current, NOW);

    expect(transitions).toEqual<RoadmapTransition[]>([
      {
        step_id: '01-01',
        from_status: 'pending',
        to_status: 'in_progress',
        teammate_id: 'crafter-01',
        timestamp: NOW,
      },
    ]);
  });

  it('should produce multiple transitions for multiple changed steps', () => {
    const previous = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
      makeStep({ id: '01-02', status: 'in_progress', teammate_id: 'crafter-02' }),
    ]);
    const current = makeRoadmap([
      makeStep({ id: '01-01', status: 'claimed', teammate_id: 'crafter-01' }),
      makeStep({ id: '01-02', status: 'review', teammate_id: 'crafter-02' }),
    ]);

    const transitions = computeTransitions(previous, current, NOW);

    expect(transitions).toHaveLength(2);
    expect(transitions).toContainEqual<RoadmapTransition>({
      step_id: '01-01',
      from_status: 'pending',
      to_status: 'claimed',
      teammate_id: 'crafter-01',
      timestamp: NOW,
    });
    expect(transitions).toContainEqual<RoadmapTransition>({
      step_id: '01-02',
      from_status: 'in_progress',
      to_status: 'review',
      teammate_id: 'crafter-02',
      timestamp: NOW,
    });
  });

  it('should ignore steps with unchanged status', () => {
    const previous = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
      makeStep({ id: '01-02', status: 'in_progress', teammate_id: 'crafter-02' }),
    ]);
    const current = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
      makeStep({ id: '01-02', status: 'approved', teammate_id: 'crafter-02' }),
    ]);

    const transitions = computeTransitions(previous, current, NOW);

    expect(transitions).toHaveLength(1);
    expect(transitions[0].step_id).toBe('01-02');
  });

  it('should handle new steps appearing in current roadmap', () => {
    const previous = makeRoadmap([
      makeStep({ id: '01-01', status: 'pending' }),
    ]);
    const current: Roadmap = {
      roadmap: { project_id: 'test', created_at: '2026-03-01T00:00:00Z' },
      phases: [
        {
          id: '01',
          name: 'Phase 1',
          steps: [makeStep({ id: '01-01', status: 'pending' })],
        },
        {
          id: '02',
          name: 'Phase 2',
          steps: [makeStep({ id: '02-01', status: 'in_progress', teammate_id: 'crafter-02' })],
        },
      ],
    };

    const transitions = computeTransitions(previous, current, NOW);

    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toEqual<RoadmapTransition>({
      step_id: '02-01',
      from_status: 'pending',
      to_status: 'in_progress',
      teammate_id: 'crafter-02',
      timestamp: NOW,
    });
  });

  it('should handle empty roadmaps', () => {
    const empty: Roadmap = { roadmap: {}, phases: [] };

    const transitions = computeTransitions(empty, empty, NOW);

    expect(transitions).toEqual([]);
  });

  it('should handle steps across multiple phases', () => {
    const previous: Roadmap = {
      roadmap: {},
      phases: [
        { id: '01', name: 'Phase 1', steps: [makeStep({ id: '01-01', status: 'approved' })] },
        { id: '02', name: 'Phase 2', steps: [makeStep({ id: '02-01', status: 'pending' })] },
      ],
    };
    const current: Roadmap = {
      roadmap: {},
      phases: [
        { id: '01', name: 'Phase 1', steps: [makeStep({ id: '01-01', status: 'approved' })] },
        { id: '02', name: 'Phase 2', steps: [makeStep({ id: '02-01', status: 'claimed', teammate_id: 'crafter-01' })] },
      ],
    };

    const transitions = computeTransitions(previous, current, NOW);

    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toEqual<RoadmapTransition>({
      step_id: '02-01',
      from_status: 'pending',
      to_status: 'claimed',
      teammate_id: 'crafter-01',
      timestamp: NOW,
    });
  });
});

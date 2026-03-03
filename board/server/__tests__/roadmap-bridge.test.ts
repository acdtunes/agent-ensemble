import { describe, it, expect } from 'vitest';
import {
  computeRoadmapSummary,
  roadmapToExecutionPlan,
  roadmapToDeliveryState,
} from '../parser.js';
import type { Roadmap, RoadmapSummary } from '../../shared/types.js';

// --- Fixtures ---

const mkStep = (overrides: Record<string, unknown> = {}) => ({
  id: '01-01',
  name: 'Step one',
  files_to_modify: [] as readonly string[],
  dependencies: [] as readonly string[],
  criteria: [] as readonly string[],
  status: 'pending' as const,
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

const mkRoadmap = (steps: ReturnType<typeof mkStep>[], phaseCount = 1): Roadmap => {
  const perPhase = Math.ceil(steps.length / phaseCount);
  const phases = Array.from({ length: phaseCount }, (_, i) => ({
    id: String(i + 1).padStart(2, '0'),
    name: `Phase ${i + 1}`,
    steps: steps.slice(i * perPhase, (i + 1) * perPhase),
  }));
  return {
    roadmap: { project_id: 'test', total_steps: steps.length, phases: phaseCount },
    phases,
  };
};

// --- computeRoadmapSummary ---

describe('computeRoadmapSummary', () => {
  it('should count mixed step statuses across multiple phases correctly', () => {
    const roadmap = mkRoadmap([
      mkStep({ id: '01-01', status: 'approved' }),
      mkStep({ id: '01-02', status: 'failed' }),
      mkStep({ id: '02-01', status: 'claimed' }),
      mkStep({ id: '02-02', status: 'in_progress' }),
      mkStep({ id: '02-03', status: 'review' }),
      mkStep({ id: '02-04', status: 'pending' }),
    ], 2);

    const summary: RoadmapSummary = computeRoadmapSummary(roadmap);

    expect(summary).toEqual({
      total_steps: 6,
      total_phases: 2,
      completed: 1,
      failed: 1,
      in_progress: 3,
      pending: 1,
    });
  });

  it('should return zeroed summary for empty roadmap', () => {
    const roadmap = mkRoadmap([]);

    const summary = computeRoadmapSummary(roadmap);

    expect(summary).toEqual({
      total_steps: 0,
      total_phases: 1,
      completed: 0,
      failed: 0,
      in_progress: 0,
      pending: 0,
    });
  });
});

// --- roadmapToExecutionPlan ---

describe('roadmapToExecutionPlan', () => {
  it('should map phases to layers and strip execution fields from steps', () => {
    const roadmap = mkRoadmap([
      mkStep({
        id: '01-01',
        name: 'Add types',
        description: 'Add shared types',
        files_to_modify: ['board/shared/types.ts'],
        status: 'approved',
        teammate_id: 'crafter-01-01',
        started_at: '2026-03-02T18:50:00Z',
        completed_at: '2026-03-02T18:51:35Z',
        review_attempts: 1,
      }),
      mkStep({
        id: '01-02',
        name: 'Create parser',
        files_to_modify: ['board/server/parser.ts'],
        dependencies: ['01-01'],
      }),
    ]);

    const plan = roadmapToExecutionPlan(roadmap);

    expect(plan.schema_version).toBe('1.0');
    expect(plan.summary.total_steps).toBe(2);
    expect(plan.summary.total_layers).toBe(1);
    expect(plan.summary.max_parallelism).toBe(1);
    expect(plan.summary.requires_worktrees).toBe(false);
    expect(plan.layers).toHaveLength(1);
    expect(plan.layers[0].layer).toBe(0);
    expect(plan.layers[0].parallel).toBe(false);
    expect(plan.layers[0].use_worktrees).toBe(false);
    expect(plan.layers[0].steps).toHaveLength(2);

    // Step fields: id mapped to step_id, execution fields stripped
    const step1 = plan.layers[0].steps[0];
    expect(step1.step_id).toBe('01-01');
    expect(step1.name).toBe('Add types');
    expect(step1.description).toBe('Add shared types');
    expect(step1.files_to_modify).toEqual(['board/shared/types.ts']);
    expect(step1.conflicts_with).toEqual([]);
    // Execution fields must NOT be present
    expect(step1).not.toHaveProperty('status');
    expect(step1).not.toHaveProperty('teammate_id');
    expect(step1).not.toHaveProperty('started_at');
    expect(step1).not.toHaveProperty('completed_at');
    expect(step1).not.toHaveProperty('review_attempts');
  });
});

// --- roadmapToDeliveryState ---

describe('roadmapToDeliveryState', () => {
  it('should map steps to StepState records keyed by id with computed summary', () => {
    const roadmap = mkRoadmap([
      mkStep({
        id: '01-01',
        name: 'Add types',
        status: 'approved',
        teammate_id: 'crafter-01-01',
        started_at: '2026-03-02T18:50:00Z',
        completed_at: '2026-03-02T18:51:35Z',
        review_attempts: 1,
        files_to_modify: ['board/shared/types.ts'],
      }),
      mkStep({
        id: '01-02',
        name: 'Create parser',
        status: 'in_progress',
        teammate_id: 'crafter-01-02',
        started_at: '2026-03-02T18:53:45Z',
        files_to_modify: ['board/server/parser.ts'],
      }),
      mkStep({
        id: '01-03',
        name: 'Create adapter',
        files_to_modify: ['board/server/browse.ts'],
      }),
    ]);

    const state = roadmapToDeliveryState(roadmap);

    expect(state.schema_version).toBe('1.0');
    expect(state.plan_path).toBe('');
    expect(state.current_layer).toBe(0);

    // Summary
    expect(state.summary).toEqual({
      total_steps: 3,
      total_layers: 1,
      completed: 1,
      failed: 0,
      in_progress: 1,
    });

    // Steps keyed by id
    expect(Object.keys(state.steps)).toHaveLength(3);
    const s1 = state.steps['01-01'];
    expect(s1.step_id).toBe('01-01');
    expect(s1.name).toBe('Add types');
    expect(s1.layer).toBe(0);
    expect(s1.status).toBe('approved');
    expect(s1.teammate_id).toBe('crafter-01-01');
    expect(s1.started_at).toBe('2026-03-02T18:50:00Z');
    expect(s1.completed_at).toBe('2026-03-02T18:51:35Z');
    expect(s1.review_attempts).toBe(1);
    expect(s1.files_to_modify).toEqual(['board/shared/types.ts']);

    const s3 = state.steps['01-03'];
    expect(s3.status).toBe('pending');
    expect(s3.teammate_id).toBeNull();

    // Teammates derived from steps with teammate_id
    expect(Object.keys(state.teammates)).toHaveLength(2);
    expect(state.teammates['crafter-01-01'].teammate_id).toBe('crafter-01-01');
    expect(state.teammates['crafter-01-02'].teammate_id).toBe('crafter-01-02');
  });
});

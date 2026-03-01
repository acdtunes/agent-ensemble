import { describe, it, expect } from 'vitest';
import { deriveProjectSummary, type ProjectId } from '../types.js';
import type { DeliveryState } from '../types.js';

const makeState = (overrides: Partial<DeliveryState> = {}): DeliveryState => ({
  schema_version: '1.0',
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-03-01T10:00:00+00:00',
  plan_path: '.nw-teams/plan.yaml',
  current_layer: 1,
  summary: {
    total_steps: 10,
    total_layers: 3,
    completed: 4,
    failed: 0,
    in_progress: 2,
  },
  steps: {},
  teammates: {},
  ...overrides,
});

describe('deriveProjectSummary', () => {
  it('should produce name matching the projectId', () => {
    const projectId = 'my-board' as ProjectId;
    const summary = deriveProjectSummary(projectId, makeState());
    expect(summary.name).toBe('my-board');
    expect(summary.projectId).toBe('my-board');
  });

  it('should extract summary stats from DeliveryState', () => {
    const projectId = 'stats-test' as ProjectId;
    const summary = deriveProjectSummary(projectId, makeState());
    expect(summary.totalSteps).toBe(10);
    expect(summary.completed).toBe(4);
    expect(summary.failed).toBe(0);
    expect(summary.inProgress).toBe(2);
  });

  it('should extract currentLayer from DeliveryState', () => {
    const projectId = 'layer-test' as ProjectId;
    const summary = deriveProjectSummary(projectId, makeState({ current_layer: 5 }));
    expect(summary.currentLayer).toBe(5);
  });

  it('should extract updatedAt from DeliveryState', () => {
    const projectId = 'time-test' as ProjectId;
    const state = makeState({ updated_at: '2026-06-15T08:00:00+00:00' });
    const summary = deriveProjectSummary(projectId, state);
    expect(summary.updatedAt).toBe('2026-06-15T08:00:00+00:00');
  });
});

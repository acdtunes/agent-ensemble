import { describe, it, expect } from 'vitest';
import { deriveProjectSummary, type ProjectId, type Roadmap, type RoadmapStep } from '../types.js';

const makeStep = (overrides: Partial<RoadmapStep> & { id: string }): RoadmapStep => ({
  name: overrides.id,
  description: '',
  files_to_modify: [],
  dependencies: [],
  criteria: [],
  status: 'pending',
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

const makeRoadmap = (steps: RoadmapStep[]): Roadmap => ({
  roadmap: {
    project_id: 'test',
    created_at: '2026-01-01T00:00:00Z',
    total_steps: steps.length,
    phases: 1,
  },
  phases: [{ id: '01', name: 'Phase 1', steps }],
});

describe('deriveProjectSummary', () => {
  it('should produce name matching the projectId', () => {
    const projectId = 'my-board' as ProjectId;
    const roadmap = makeRoadmap([makeStep({ id: '01-01' })]);
    const summary = deriveProjectSummary(projectId, roadmap);
    expect(summary.name).toBe('my-board');
    expect(summary.projectId).toBe('my-board');
  });

  it('should extract summary stats from Roadmap', () => {
    const projectId = 'stats-test' as ProjectId;
    const roadmap = makeRoadmap([
      makeStep({ id: '01-01', status: 'approved' }),
      makeStep({ id: '01-02', status: 'approved' }),
      makeStep({ id: '01-03', status: 'in_progress' }),
      makeStep({ id: '01-04', status: 'pending' }),
    ]);
    const summary = deriveProjectSummary(projectId, roadmap);
    expect(summary.totalSteps).toBe(4);
    expect(summary.done).toBe(2);
    expect(summary.inProgress).toBe(1);
  });

  it('should count completed phases for currentLayer', () => {
    const projectId = 'layer-test' as ProjectId;
    const roadmap: Roadmap = {
      roadmap: { project_id: 'test', created_at: '2026-01-01T00:00:00Z', total_steps: 3, phases: 3 },
      phases: [
        { id: '01', name: 'Phase 1', steps: [makeStep({ id: '01-01', status: 'approved' })] },
        { id: '02', name: 'Phase 2', steps: [makeStep({ id: '02-01', status: 'approved' })] },
        { id: '03', name: 'Phase 3', steps: [makeStep({ id: '03-01', status: 'pending' })] },
      ],
    };
    const summary = deriveProjectSummary(projectId, roadmap);
    expect(summary.currentLayer).toBe(2); // 2 phases completed
  });

  it('should extract updatedAt from latest step timestamp', () => {
    const projectId = 'time-test' as ProjectId;
    const roadmap = makeRoadmap([
      makeStep({ id: '01-01', status: 'approved', completed_at: '2026-06-15T08:00:00Z' }),
    ]);
    const summary = deriveProjectSummary(projectId, roadmap);
    expect(summary.updatedAt).toBe('2026-06-15T08:00:00Z');
  });
});

import { describe, it, expect } from 'vitest';
import {
  createProjectId,
  deriveProjectSummary,
  type ProjectSummary,
  type ClientWSMessage,
  type ServerWSMessage,
  type Roadmap,
  type RoadmapStep,
} from '../types.js';

// --- Fixtures ---

const makeStep = (overrides: Partial<RoadmapStep> = {}): RoadmapStep => ({
  id: '01-01',
  name: 'Test step',
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

const validRoadmap: Roadmap = {
  roadmap: { project_id: 'test', created_at: '2026-03-01T00:00:00Z' },
  phases: [{
    id: '01',
    name: 'Phase 1',
    steps: [
      makeStep({ id: '01-01', status: 'approved', started_at: '2026-03-01T00:00:00Z', completed_at: '2026-03-01T12:30:00+00:00' }),
      makeStep({ id: '01-02', status: 'approved', started_at: '2026-03-01T00:00:00Z', completed_at: '2026-03-01T12:30:00+00:00' }),
    ],
  }, {
    id: '02',
    name: 'Phase 2',
    steps: [
      makeStep({ id: '02-01', status: 'in_progress', started_at: '2026-03-01T12:30:00+00:00' }),
      makeStep({ id: '02-02', status: 'review', started_at: '2026-03-01T12:30:00+00:00' }),
      makeStep({ id: '02-03' }),
    ],
  }],
};

// --- Acceptance Tests ---

describe('Multi-project type extensions', () => {
  describe('ProjectSummary derivation', () => {
    it('should derive correct summary from ProjectId and Roadmap', () => {
      const idResult = createProjectId('kanban-board');
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const summary: ProjectSummary = deriveProjectSummary(idResult.value, validRoadmap);

      expect(summary.projectId).toBe('kanban-board');
      expect(summary.name).toBe('kanban-board');
      expect(summary.totalSteps).toBe(5);
      expect(summary.done).toBe(2);
      expect(summary.inProgress).toBe(2);
      expect(summary.currentLayer).toBe(1);
      expect(summary.updatedAt).toBe('2026-03-01T12:30:00+00:00');
    });
  });

  describe('WebSocket message round-trip', () => {
    it('should round-trip subscribe/init through ClientWSMessage and ServerWSMessage unions', () => {
      const idResult = createProjectId('my-project');
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;
      const projectId = idResult.value;

      // Client sends subscribe
      const clientMsg: ClientWSMessage = {
        type: 'subscribe',
        projectId,
      };
      expect(clientMsg.type).toBe('subscribe');
      expect(clientMsg.projectId).toBe('my-project');

      // Server responds with init — includes only roadmap
      const serverMsg: ServerWSMessage = {
        type: 'init',
        projectId,
        roadmap: validRoadmap,
      };
      expect(serverMsg.type).toBe('init');
      expect(serverMsg.projectId).toBe(projectId);
      if (serverMsg.type === 'init') {
        expect(serverMsg.roadmap).toEqual(validRoadmap);
      }

      // Verify no data loss through JSON round-trip
      const serialized = JSON.stringify(serverMsg);
      const deserialized = JSON.parse(serialized) as ServerWSMessage;
      expect(deserialized).toEqual(serverMsg);
    });

    it('should include roadmap and roadmapTransitions in update message', () => {
      const idResult = createProjectId('update-proj');
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const updatedRoadmap: Roadmap = {
        ...validRoadmap,
        phases: [{ id: '01', name: 'Phase 1', steps: [makeStep({ status: 'in_progress' })] }],
      };

      const serverMsg: ServerWSMessage = {
        type: 'update',
        projectId: idResult.value,
        roadmap: updatedRoadmap,
        roadmapTransitions: [{ step_id: '01-01', from_status: 'pending', to_status: 'in_progress', teammate_id: null, timestamp: '2026-03-01T01:00:00Z' }],
      };

      expect(serverMsg.type).toBe('update');
      if (serverMsg.type !== 'update') return;
      expect(serverMsg.roadmap).toEqual(updatedRoadmap);
      expect(serverMsg.roadmapTransitions).toHaveLength(1);
    });
  });

});

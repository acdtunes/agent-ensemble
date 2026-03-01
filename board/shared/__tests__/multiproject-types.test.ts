import { describe, it, expect } from 'vitest';
import {
  createProjectId,
  deriveProjectSummary,
  type ProjectId,
  type ProjectSummary,
  type ProjectEntry,
  type ClientWSMessage,
  type ServerWSMessage,
  type ProjectConfig,
} from '../types.js';
import type { DeliveryState, ExecutionPlan } from '../types.js';

// --- Fixtures ---

const validDeliveryState: DeliveryState = {
  schema_version: '1.0',
  created_at: '2026-03-01T00:00:00+00:00',
  updated_at: '2026-03-01T12:30:00+00:00',
  plan_path: '.nw-teams/plan.yaml',
  current_layer: 2,
  summary: {
    total_steps: 5,
    total_layers: 3,
    completed: 2,
    failed: 1,
    in_progress: 1,
  },
  steps: {},
  teammates: {},
};

const validPlan: ExecutionPlan = {
  schema_version: '1.0',
  summary: {
    total_steps: 5,
    total_layers: 3,
    max_parallelism: 2,
    requires_worktrees: false,
  },
  layers: [],
};

// --- Acceptance Tests ---

describe('Multi-project type extensions', () => {
  describe('ProjectId validation', () => {
    it('should accept valid slug and reject invalid values', () => {
      const valid = createProjectId('my-project-123');
      expect(valid.ok).toBe(true);
      if (!valid.ok) return;
      expect(valid.value).toBe('my-project-123');

      const invalid = createProjectId('My Project!');
      expect(invalid.ok).toBe(false);
      if (invalid.ok) return;
      expect(invalid.error).toContain('Invalid project ID');
    });
  });

  describe('ProjectSummary derivation', () => {
    it('should derive correct summary from ProjectId and DeliveryState', () => {
      const idResult = createProjectId('kanban-board');
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;

      const summary: ProjectSummary = deriveProjectSummary(idResult.value, validDeliveryState);

      expect(summary.projectId).toBe('kanban-board');
      expect(summary.name).toBe('kanban-board');
      expect(summary.totalSteps).toBe(5);
      expect(summary.completed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.inProgress).toBe(1);
      expect(summary.currentLayer).toBe(2);
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

      // Server responds with init
      const serverMsg: ServerWSMessage = {
        type: 'init',
        projectId,
        state: validDeliveryState,
        plan: validPlan,
      };
      expect(serverMsg.type).toBe('init');
      expect(serverMsg.projectId).toBe(projectId);
      expect(serverMsg.state).toEqual(validDeliveryState);
      if (serverMsg.type === 'init') {
        expect(serverMsg.plan).toEqual(validPlan);
      }

      // Verify no data loss through JSON round-trip
      const serialized = JSON.stringify(serverMsg);
      const deserialized = JSON.parse(serialized) as ServerWSMessage;
      expect(deserialized).toEqual(serverMsg);
    });
  });

  describe('ClientWSMessage coverage', () => {
    it('should cover subscribe and unsubscribe variants', () => {
      const idResult = createProjectId('test-proj');
      expect(idResult.ok).toBe(true);
      if (!idResult.ok) return;
      const projectId = idResult.value;

      const subscribe: ClientWSMessage = { type: 'subscribe', projectId };
      const unsubscribe: ClientWSMessage = { type: 'unsubscribe', projectId };

      expect(subscribe.type).toBe('subscribe');
      expect(unsubscribe.type).toBe('unsubscribe');
      expect(subscribe.projectId).toBe(projectId);
      expect(unsubscribe.projectId).toBe(projectId);
    });
  });
});

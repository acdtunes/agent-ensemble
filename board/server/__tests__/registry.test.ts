import { describe, it, expect } from 'vitest';
import type {
  DeliveryState,
  ExecutionPlan,
  ProjectConfig,
  ProjectId,
  ParseError,
  Result,
  Roadmap,
  RoadmapStep,
} from '../../shared/types.js';
import { ok, err, createProjectId } from '../../shared/types.js';
import type { FileWatcher, OnChangeCallback } from '../watcher.js';
import {
  createProjectRegistry,
  type RegistryDeps,
  type ProjectRegistry,
} from '../registry.js';

// --- Test helpers ---

const makeProjectId = (raw: string): ProjectId => {
  const result = createProjectId(raw);
  if (!result.ok) throw new Error(`Invalid test project ID: ${raw}`);
  return result.value;
};

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

const makeRoadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  roadmap: { project_id: 'test', created_at: '2026-03-01T00:00:00Z' },
  phases: [{
    id: '01',
    name: 'Phase 1',
    steps: [makeStep()],
  }],
  ...overrides,
});

const makeBridgedState = (roadmap: Roadmap): DeliveryState => {
  const allSteps = roadmap.phases.flatMap((p) => p.steps);
  const completed = allSteps.filter((s) => s.status === 'approved').length;
  const failed = allSteps.filter((s) => s.status === 'failed').length;
  const inProgress = allSteps.filter((s) => ['claimed', 'in_progress', 'review'].includes(s.status)).length;

  return {
    schema_version: '1.0',
    created_at: roadmap.roadmap.created_at ?? '',
    updated_at: '',
    plan_path: '',
    current_layer: 0,
    summary: {
      total_steps: allSteps.length,
      total_layers: roadmap.phases.length,
      completed,
      failed,
      in_progress: inProgress,
    },
    steps: Object.fromEntries(
      roadmap.phases.flatMap((p, li) =>
        p.steps.map((s) => [s.id, {
          step_id: s.id,
          name: s.name,
          layer: li,
          status: s.status,
          teammate_id: s.teammate_id,
          started_at: s.started_at,
          completed_at: s.completed_at,
          review_attempts: s.review_attempts,
          files_to_modify: s.files_to_modify as string[],
        }]),
      ),
    ),
    teammates: {},
  };
};

const makeBridgedPlan = (roadmap: Roadmap): ExecutionPlan => ({
  schema_version: '1.0',
  summary: {
    total_steps: roadmap.phases.reduce((n, p) => n + p.steps.length, 0),
    total_layers: roadmap.phases.length,
    max_parallelism: 1,
    requires_worktrees: false,
  },
  layers: roadmap.phases.map((p, i) => ({
    layer: i,
    parallel: false,
    use_worktrees: false,
    steps: p.steps.map((s) => ({
      step_id: s.id,
      name: s.name,
      files_to_modify: s.files_to_modify as string[],
      conflicts_with: [],
    })),
  })),
});

const makeConfig = (projectId: ProjectId): ProjectConfig => ({
  projectId,
  projectPath: `/projects/${projectId}`,
  statePath: `/projects/${projectId}/state.yaml`,
  planPath: `/projects/${projectId}/plan.yaml`,
  roadmapPath: `/projects/${projectId}/roadmap.yaml`,
});

// --- Watcher spy ---

interface WatcherInstance {
  readonly filePath: string;
  readonly onChange: OnChangeCallback;
  closed: boolean;
}

const createWatcherSpy = () => {
  const instances: WatcherInstance[] = [];

  const factory = (filePath: string, onChange: OnChangeCallback): FileWatcher => {
    const instance: WatcherInstance = { filePath, onChange, closed: false };
    instances.push(instance);
    return {
      ready: Promise.resolve(),
      close: async () => { instance.closed = true; },
    };
  };

  return { factory, instances };
};

// --- Default deps factory ---

const createTestDeps = (overrides: Partial<RegistryDeps> = {}) => {
  const watcherSpy = createWatcherSpy();
  const stateChanges: Array<{ projectId: ProjectId; previousState: DeliveryState; newState: DeliveryState }> = [];
  const defaultRoadmap = makeRoadmap();

  const deps: RegistryDeps = {
    createWatcher: watcherSpy.factory,
    readFile: () => ok('mock-yaml-content'),
    parseRoadmap: () => ok(defaultRoadmap),
    roadmapToDeliveryState: makeBridgedState,
    roadmapToExecutionPlan: makeBridgedPlan,
    onStateChange: (projectId, previousState, newState) => { stateChanges.push({ projectId, previousState, newState }); },
    ...overrides,
  };

  return { deps, watcherSpy, stateChanges, defaultRoadmap };
};

// --- Tests ---

describe('ProjectRegistry', () => {
  const PROJECT_A = makeProjectId('project-a');
  const PROJECT_B = makeProjectId('project-b');

  describe('add', () => {
    it('should create a file watcher on the roadmap path and store the entry with bridged state and plan', () => {
      const { deps, watcherSpy, defaultRoadmap } = createTestDeps();
      const registry = createProjectRegistry(deps);
      const config = makeConfig(PROJECT_A);

      const result = registry.add(config);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.projectId).toBe(PROJECT_A);
      expect(result.value.state).toEqual(makeBridgedState(defaultRoadmap));
      expect(result.value.plan).toEqual(makeBridgedPlan(defaultRoadmap));

      // Watcher created on the roadmap file path
      expect(watcherSpy.instances).toHaveLength(1);
      expect(watcherSpy.instances[0].filePath).toBe(config.roadmapPath);
    });

    it('should return project_exists error when adding duplicate project', () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);
      const config = makeConfig(PROJECT_A);

      registry.add(config);
      const result = registry.add(config);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.type).toBe('project_exists');
    });

    it('should still add project with empty roadmap when roadmap file cannot be read', () => {
      const { deps } = createTestDeps({
        readFile: () => err('File not found'),
      });
      const registry = createProjectRegistry(deps);

      const result = registry.add(makeConfig(PROJECT_A));

      // Project added with empty roadmap (no watcher)
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.state.summary.total_steps).toBe(0);
    });

    it('should still add project with empty roadmap when roadmap parsing fails', () => {
      const parseError: ParseError = { type: 'invalid_yaml', message: 'bad yaml' };
      const { deps } = createTestDeps({
        parseRoadmap: () => err(parseError),
      });
      const registry = createProjectRegistry(deps);

      const result = registry.add(makeConfig(PROJECT_A));

      // Project added with empty roadmap (no watcher)
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.state.summary.total_steps).toBe(0);
    });
  });

  describe('remove', () => {
    it('should close the watcher and delete the entry', async () => {
      const { deps, watcherSpy } = createTestDeps();
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      const result = await registry.remove(PROJECT_A);

      expect(result.ok).toBe(true);
      expect(watcherSpy.instances[0].closed).toBe(true);

      // Entry no longer accessible
      const getResult = registry.get(PROJECT_A);
      expect(getResult.ok).toBe(false);
    });

    it('should return project_not_found error for unknown project', async () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);

      const result = await registry.remove(PROJECT_A);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.type).toBe('project_not_found');
    });
  });

  describe('get', () => {
    it('should return the stored entry with bridged state and plan', () => {
      const { deps, defaultRoadmap } = createTestDeps();
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      const result = registry.get(PROJECT_A);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.projectId).toBe(PROJECT_A);
      expect(result.value.state).toEqual(makeBridgedState(defaultRoadmap));
      expect(result.value.plan).toEqual(makeBridgedPlan(defaultRoadmap));
    });

    it('should return project_not_found error for unknown project', () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);

      const result = registry.get(PROJECT_A);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.type).toBe('project_not_found');
    });
  });

  describe('list', () => {
    it('should return all registered project IDs', () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);

      expect(registry.list()).toEqual([]);

      registry.add(makeConfig(PROJECT_A));
      registry.add(makeConfig(PROJECT_B));

      const ids = registry.list();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(PROJECT_A);
      expect(ids).toContain(PROJECT_B);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no projects registered', () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);

      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered project entries', () => {
      const { deps } = createTestDeps();
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));
      registry.add(makeConfig(PROJECT_B));

      const entries = registry.getAll();

      expect(entries).toHaveLength(2);
      const ids = entries.map((e) => e.projectId);
      expect(ids).toContain(PROJECT_A);
      expect(ids).toContain(PROJECT_B);
    });
  });

  describe('roadmap change broadcast', () => {
    it('should call onStateChange with bridged DeliveryState when watcher detects a valid roadmap change', () => {
      const updatedRoadmap = makeRoadmap({
        phases: [{
          id: '01',
          name: 'Phase 1',
          steps: [makeStep({ status: 'approved', completed_at: '2026-03-01T01:00:00Z' })],
        }],
      });
      const { deps, watcherSpy, stateChanges } = createTestDeps({
        parseRoadmap: () => ok(updatedRoadmap),
      });
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      // Simulate watcher firing with new content
      watcherSpy.instances[0].onChange('new-yaml-content');

      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].projectId).toBe(PROJECT_A);
      expect(stateChanges[0].newState).toEqual(makeBridgedState(updatedRoadmap));

      // Stored entry should also reflect the updated roadmap
      const entry = registry.get(PROJECT_A);
      expect(entry.ok).toBe(true);
      if (!entry.ok) return;
      expect(entry.value.state).toEqual(makeBridgedState(updatedRoadmap));
    });

    it('should pass previous bridged state to onStateChange callback', () => {
      const initialRoadmap = makeRoadmap();
      const updatedRoadmap = makeRoadmap({
        phases: [{
          id: '01',
          name: 'Phase 1',
          steps: [makeStep({ status: 'in_progress', started_at: '2026-03-01T01:00:00Z' })],
        }],
      });

      let parseCallCount = 0;
      const { deps, watcherSpy, stateChanges } = createTestDeps({
        parseRoadmap: () => ok(parseCallCount++ === 0 ? initialRoadmap : updatedRoadmap),
      });
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      watcherSpy.instances[0].onChange('new-yaml-content');

      expect(stateChanges).toHaveLength(1);
      // Previous state is bridged from the initial roadmap
      expect(stateChanges[0].previousState.steps['01-01'].status).toBe('pending');
      // New state is bridged from the updated roadmap
      expect(stateChanges[0].newState.steps['01-01'].status).toBe('in_progress');
    });

    it('should not broadcast when roadmap parsing fails', () => {
      const initialRoadmap = makeRoadmap();
      let callCount = 0;
      const { deps, watcherSpy, stateChanges } = createTestDeps({
        parseRoadmap: () => {
          callCount++;
          return callCount === 1
            ? ok(initialRoadmap)
            : err({ type: 'invalid_yaml', message: 'corrupt' } as ParseError);
        },
      });
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      watcherSpy.instances[0].onChange('corrupt-yaml');

      expect(stateChanges).toHaveLength(0);
    });

    it('should call onParseError when watcher detects invalid YAML', () => {
      const initialRoadmap = makeRoadmap();
      const parseErrors: Array<{ projectId: ProjectId; error: string }> = [];
      let callCount = 0;
      const { deps, watcherSpy } = createTestDeps({
        parseRoadmap: () => {
          callCount++;
          return callCount === 1
            ? ok(initialRoadmap)
            : err({ type: 'invalid_yaml', message: 'bad yaml syntax' } as ParseError);
        },
        onParseError: (projectId, error) => { parseErrors.push({ projectId, error }); },
      });
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      watcherSpy.instances[0].onChange('corrupt-yaml');

      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].projectId).toBe(PROJECT_A);
      expect(parseErrors[0].error).toBe('bad yaml syntax');
    });

    it('should retain last-known-good state when parsing fails', () => {
      const goodRoadmap = makeRoadmap();
      let callCount = 0;
      const { deps, watcherSpy } = createTestDeps({
        parseRoadmap: () => {
          callCount++;
          return callCount === 1
            ? ok(goodRoadmap)
            : err({ type: 'invalid_yaml', message: 'corrupt' } as ParseError);
        },
      });
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));

      watcherSpy.instances[0].onChange('corrupt-yaml');

      const result = registry.get(PROJECT_A);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.state).toEqual(makeBridgedState(goodRoadmap));
    });

    it('should isolate parse errors: invalid YAML in project A does not affect project B', () => {
      const roadmapA = makeRoadmap();
      const roadmapB = makeRoadmap({
        roadmap: { project_id: 'b', created_at: '2026-03-01T00:30:00Z' },
      });
      const updatedB = makeRoadmap({
        roadmap: { project_id: 'b', created_at: '2026-03-01T00:30:00Z' },
        phases: [{
          id: '01',
          name: 'Phase 1',
          steps: [makeStep({ status: 'approved', completed_at: '2026-03-01T01:00:00Z' })],
        }],
      });

      let parseCallIndex = 0;
      const parseResults: Array<Result<Roadmap, ParseError>> = [
        ok(roadmapA),
        ok(roadmapB),
        err({ type: 'invalid_yaml', message: 'corrupt' }),
        ok(updatedB),
      ];

      const parseErrors: Array<{ projectId: ProjectId; error: string }> = [];
      const { deps, watcherSpy } = createTestDeps({
        parseRoadmap: () => parseResults[parseCallIndex++],
        onParseError: (projectId, error) => { parseErrors.push({ projectId, error }); },
      });
      const registry = createProjectRegistry(deps);

      registry.add(makeConfig(PROJECT_A));
      registry.add(makeConfig(PROJECT_B));

      // Project A gets corrupt YAML
      watcherSpy.instances[0].onChange('corrupt-yaml');

      // Project B gets valid update
      watcherSpy.instances[1].onChange('valid-yaml');

      // Project A retains last-known-good state
      const resultA = registry.get(PROJECT_A);
      expect(resultA.ok).toBe(true);
      if (!resultA.ok) return;
      expect(resultA.value.state).toEqual(makeBridgedState(roadmapA));

      // Project B received update
      const resultB = registry.get(PROJECT_B);
      expect(resultB.ok).toBe(true);
      if (!resultB.ok) return;
      expect(resultB.value.state).toEqual(makeBridgedState(updatedB));

      // Error was reported only for A
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].projectId).toBe(PROJECT_A);
    });

    it('should not affect other projects when one project roadmap changes', () => {
      const roadmapA = makeRoadmap();
      const roadmapB = makeRoadmap({
        roadmap: { project_id: 'b', created_at: '2026-03-01T00:30:00Z' },
      });
      const updatedA = makeRoadmap({
        phases: [{
          id: '01',
          name: 'Phase 1',
          steps: [makeStep({ status: 'in_progress', started_at: '2026-03-01T01:00:00Z' })],
        }],
      });

      let parseCallIndex = 0;
      const parseResults = [roadmapA, roadmapB, updatedA];

      const { deps, watcherSpy } = createTestDeps({
        parseRoadmap: () => ok(parseResults[parseCallIndex++]),
      });
      const registry = createProjectRegistry(deps);

      registry.add(makeConfig(PROJECT_A));
      registry.add(makeConfig(PROJECT_B));

      // Simulate state change in project A only
      watcherSpy.instances[0].onChange('updated-a-content');

      // Project A should have updated state
      const resultA = registry.get(PROJECT_A);
      expect(resultA.ok).toBe(true);
      if (!resultA.ok) return;
      expect(resultA.value.state).toEqual(makeBridgedState(updatedA));

      // Project B should be unaffected
      const resultB = registry.get(PROJECT_B);
      expect(resultB.ok).toBe(true);
      if (!resultB.ok) return;
      expect(resultB.value.state).toEqual(makeBridgedState(roadmapB));
    });
  });

  describe('close', () => {
    it('should close all project watchers', async () => {
      const { deps, watcherSpy } = createTestDeps();
      const registry = createProjectRegistry(deps);
      registry.add(makeConfig(PROJECT_A));
      registry.add(makeConfig(PROJECT_B));

      await registry.close();

      expect(watcherSpy.instances).toHaveLength(2);
      expect(watcherSpy.instances.every((w) => w.closed)).toBe(true);
    });
  });
});

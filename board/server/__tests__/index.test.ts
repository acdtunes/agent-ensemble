import { describe, it, expect, afterEach } from 'vitest';
import type {
  DeliveryState,
  ExecutionPlan,
  ProjectId,
  ProjectEntry,
  ProjectSummary,
  Result,
} from '../../shared/types.js';
import { ok, err, deriveProjectSummary } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
} from '../index.js';

// --- Fixtures ---

const makeProjectId = (id: string): ProjectId => id as ProjectId;

const makePlan = (): ExecutionPlan => ({
  schema_version: '1.0',
  summary: { total_steps: 1, total_layers: 1, max_parallelism: 1, requires_worktrees: false },
  layers: [{
    layer: 1,
    parallel: false,
    use_worktrees: false,
    steps: [{ step_id: '01-01', name: 'Test step', files_to_modify: [] }],
  }],
});

const makeState = (): DeliveryState => ({
  schema_version: '1.0',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  plan_path: '.nw-teams/plan.yaml',
  current_layer: 1,
  summary: { total_steps: 1, total_layers: 1, completed: 0, failed: 0, in_progress: 0 },
  steps: {
    '01-01': {
      step_id: '01-01',
      name: 'Test step',
      layer: 1,
      status: 'pending',
      teammate_id: null,
      started_at: null,
      completed_at: null,
      review_attempts: 0,
      files_to_modify: [],
    },
  },
  teammates: {},
});

const makeEntry = (id: string): ProjectEntry => ({
  projectId: makeProjectId(id),
  state: makeState(),
  plan: makePlan(),
});

// --- Deps factory using in-memory store ---

const createTestDeps = (entries: ProjectEntry[] = []): MultiProjectHttpDeps => {
  const store = new Map<ProjectId, ProjectEntry>(
    entries.map((e) => [e.projectId, e]),
  );

  return {
    getProject: (projectId: ProjectId): Result<ProjectEntry, string> => {
      const entry = store.get(projectId);
      return entry ? ok(entry) : err(`Not found: ${projectId}`);
    },
    listProjectSummaries: (): readonly ProjectSummary[] =>
      [...store.values()].map((e) => deriveProjectSummary(e.projectId, e.state)),
  };
};

// --- Feature artifact deps factory ---

const createFeatureArtifactDeps = (
  projectPaths: Record<string, string>,
  fileContents: Record<string, Result<string, string>>,
): MultiProjectHttpDeps => ({
  ...createTestDeps([]),
  featureArtifacts: {
    getProjectPath: (projectId: ProjectId): string | undefined =>
      projectPaths[projectId as string],
    readFile: async (path: string): Promise<Result<string, string>> =>
      fileContents[path] ?? err(`File not found: ${path}`),
  },
});

// --- Tests ---

describe('Multi-project HTTP endpoints', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  describe('GET /api/projects', () => {
    it('should return list of ProjectSummary for all registered projects', async () => {
      const deps = createTestDeps([makeEntry('proj-1'), makeEntry('proj-2')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      const body = await response.json();
      expect(body).toHaveLength(2);
      const ids = body.map((p: ProjectSummary) => p.projectId).sort();
      expect(ids).toEqual(['proj-1', 'proj-2']);
    });

    it('should return empty array when no projects registered', async () => {
      const deps = createTestDeps([]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/projects/:id/state', () => {
    it('should return state for known project', async () => {
      const entry = makeEntry('known');
      const deps = createTestDeps([entry]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/known/state`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(entry.state);
    });

    it('should return 404 for unknown projectId', async () => {
      const deps = createTestDeps([]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/unknown/state`);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toMatch(/not found/i);
    });

    it('should return 400 for invalid project ID format', async () => {
      const deps = createTestDeps([]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/INVALID_ID/state`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/projects/:id/plan', () => {
    it('should return plan for known project', async () => {
      const entry = makeEntry('known');
      const deps = createTestDeps([entry]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/known/plan`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(entry.plan);
    });

    it('should return 404 for unknown projectId', async () => {
      const deps = createTestDeps([]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/unknown/plan`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/projects/:id/features/:featureId/roadmap', () => {
    const validRoadmapYaml = [
      'roadmap:',
      '  project_id: test-project',
      "  created_at: '2026-03-01T00:00:00Z'",
      '  total_steps: 2',
      '  phases: 1',
      'phases:',
      "- id: '01'",
      '  name: Phase 1',
      '  steps:',
      '  - id: 01-01',
      '    name: Step one',
      '    files_to_modify: []',
      '    dependencies: []',
      '    criteria: []',
      '    status: approved',
      '    teammate_id: crafter-01',
      "    started_at: '2026-03-01T00:00:00Z'",
      "    completed_at: '2026-03-01T01:00:00Z'",
      '    review_attempts: 1',
      '  - id: 01-02',
      '    name: Step two',
      '    files_to_modify:',
      '      - src/foo.ts',
      '    dependencies:',
      '      - 01-01',
      '    criteria:',
      '      - Must do X',
      '    status: in_progress',
      '    teammate_id: crafter-02',
      "    started_at: '2026-03-01T02:00:00Z'",
      '    review_attempts: 0',
    ].join('\n');

    it('should return parsed roadmap with computed summary', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        { '/fake/test-proj/docs/feature/my-feature/roadmap.yaml': ok(validRoadmapYaml) },
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.roadmap.project_id).toBe('test-project');
      expect(body.phases).toHaveLength(1);
      expect(body.phases[0].steps).toHaveLength(2);
      expect(body.summary).toEqual({
        total_steps: 2,
        total_phases: 1,
        completed: 1,
        failed: 0,
        in_progress: 1,
        pending: 0,
      });
    });

    it('should return 404 when roadmap.yaml not found', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        {},
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toMatch(/not found/i);
    });

    it('should return 422 when roadmap.yaml is malformed', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        { '/fake/test-proj/docs/feature/my-feature/roadmap.yaml': ok('roadmap: {}') },
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toMatch(/malformed/i);
    });
  });

  describe('HttpServer', () => {
    it('should start on configurable port', async () => {
      const deps = createTestDeps([makeEntry('test')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      expect(server.port).toBeGreaterThan(0);

      const response = await fetch(`http://localhost:${server.port}/api/projects`);
      expect(response.status).toBe(200);
    });
  });
});

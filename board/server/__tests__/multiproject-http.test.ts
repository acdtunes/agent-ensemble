import { describe, it, expect, afterEach } from 'vitest';
import type { ProjectId, ProjectEntry, ProjectSummary, DeliveryState, ExecutionPlan, AddProjectError, RemoveProjectError, Result } from '../../shared/types.js';
import { ok, err, createProjectId } from '../../shared/types.js';
import { createMultiProjectHttpApp, createHttpServer, type HttpServer, type MultiProjectHttpDeps } from '../index.js';

// --- Fixtures ---

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

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  state: makeState(),
  plan: makePlan(),
});

const makeSummary = (projectId: ProjectId): ProjectSummary => ({
  projectId,
  name: projectId as string,
  totalSteps: 1,
  completed: 0,
  failed: 0,
  inProgress: 0,
  currentLayer: 1,
  updatedAt: '2026-03-01T00:00:00Z',
  featureCount: 0,
  features: [],
});

const makeDeps = (entries: Map<ProjectId, ProjectEntry>): MultiProjectHttpDeps => ({
  listProjectSummaries: () =>
    [...entries.values()].map((e) => ({
      projectId: e.projectId,
      name: e.projectId as string,
      totalSteps: e.state.summary.total_steps,
      completed: e.state.summary.completed,
      failed: e.state.summary.failed,
      inProgress: e.state.summary.in_progress,
      currentLayer: e.state.current_layer,
      updatedAt: e.state.updated_at,
      featureCount: 0,
      features: [],
    })),
  getProject: (id) => {
    const entry = entries.get(id);
    return entry ? ok(entry) : err({ type: 'project_not_found', projectId: id });
  },
});

const makeDepsWithProjectOps = (ops: {
  addProject?: (path: string) => Promise<Result<ProjectSummary, AddProjectError>>;
  removeProject?: (projectId: ProjectId) => Promise<Result<void, RemoveProjectError>>;
}): MultiProjectHttpDeps => ({
  ...makeDeps(new Map()),
  ...ops,
});

describe('Multi-project HTTP routes', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should return list of ProjectSummary on GET /api/projects', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha, makeEntry(projectAlpha));
    const app = createMultiProjectHttpApp(makeDeps(entries));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].projectId).toBe('alpha');
    expect(body[0].totalSteps).toBe(1);
  });

  it('should return project state on GET /api/projects/:id/state', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha, makeEntry(projectAlpha));
    const app = createMultiProjectHttpApp(makeDeps(entries));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/state`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schema_version).toBe('1.0');
    expect(body.current_layer).toBe(1);
  });

  it('should return 404 for unknown project on GET /api/projects/:id/state', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    const app = createMultiProjectHttpApp(makeDeps(entries));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/unknown/state`);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('should return project plan on GET /api/projects/:id/plan', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha, makeEntry(projectAlpha));
    const app = createMultiProjectHttpApp(makeDeps(entries));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/plan`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schema_version).toBe('1.0');
    expect(body.layers).toHaveLength(1);
  });

  it('should return 400 for invalid project ID format', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    const app = createMultiProjectHttpApp(makeDeps(entries));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/INVALID!/state`);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/projects', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should return 201 with ProjectSummary for valid path', async () => {
    const summary = makeSummary(projectAlpha);
    const deps = makeDepsWithProjectOps({
      addProject: async () => ok(summary),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/valid/path/alpha' }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.projectId).toBe('alpha');
    expect(body.totalSteps).toBe(1);
  });

  it('should return 400 when path is missing from body', async () => {
    const deps = makeDepsWithProjectOps({
      addProject: async () => ok(makeSummary(projectAlpha)),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/path/i);
  });

  it('should return 400 for invalid project path', async () => {
    const deps = makeDepsWithProjectOps({
      addProject: async () => err({ type: 'invalid_path' as const, message: 'No state.yaml found' }),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/nonexistent/path' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/state\.yaml/i);
  });

  it('should return 409 for duplicate project', async () => {
    const deps = makeDepsWithProjectOps({
      addProject: async () => err({ type: 'duplicate' as const, projectId: projectAlpha }),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/valid/path/alpha' }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
  });
});

describe('DELETE /api/projects/:id', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should return 204 when project is removed', async () => {
    const deps = makeDepsWithProjectOps({
      removeProject: async () => ok(undefined as void),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
  });

  it('should return 404 when project does not exist', async () => {
    const deps = makeDepsWithProjectOps({
      removeProject: async () => err({ type: 'not_found' as const, projectId: projectAlpha }),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('should return 400 for invalid project ID format on delete', async () => {
    const deps = makeDepsWithProjectOps({
      removeProject: async () => ok(undefined as void),
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/INVALID!`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
  });
});

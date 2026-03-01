import { describe, it, expect, afterEach } from 'vitest';
import type { DeliveryState, ExecutionPlan } from '../../shared/types.js';
import { createHttpApp, createHttpServer, type HttpServer } from '../index.js';

// --- Fixtures ---

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

describe('HTTP endpoints', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should return current delivery state as JSON with 200 on GET /api/state', async () => {
    const state = makeState();
    const plan = makePlan();
    const app = createHttpApp({
      getState: () => state,
      getPlan: () => plan,
    });
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/state`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body).toEqual(state);
  });

  it('should return execution plan as JSON with 200 on GET /api/plan', async () => {
    const state = makeState();
    const plan = makePlan();
    const app = createHttpApp({
      getState: () => state,
      getPlan: () => plan,
    });
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/plan`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body).toEqual(plan);
  });

  it('should return 503 with descriptive message when state is unavailable', async () => {
    const app = createHttpApp({
      getState: () => null,
      getPlan: () => null,
    });
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/state`);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/state/i);
  });

  it('should return 503 with descriptive message when plan is unavailable', async () => {
    const app = createHttpApp({
      getState: () => null,
      getPlan: () => null,
    });
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/plan`);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/plan/i);
  });

  it('should start on configurable port', async () => {
    const app = createHttpApp({
      getState: () => makeState(),
      getPlan: () => makePlan(),
    });
    // Port 0 means OS-assigned; verify server reports the actual port
    server = createHttpServer(app, 0);
    await server.ready;

    expect(server.port).toBeGreaterThan(0);

    const response = await fetch(`http://localhost:${server.port}/api/state`);
    expect(response.status).toBe(200);
  });
});

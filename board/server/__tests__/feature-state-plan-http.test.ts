/**
 * HTTP endpoint tests: Feature-level state and plan routes
 *
 * Tests the Express route handlers for:
 *   GET /api/projects/:id/features/:featureId/state
 *   GET /api/projects/:id/features/:featureId/plan
 *
 * Uses injected FeatureArtifactDeps (getProjectPath + readFile) — no filesystem access.
 * Pure functions (resolveFeatureExecutionLog, resolveFeatureRoadmap, parseStateYaml, parsePlanYaml) run for real.
 */

import { describe, it, expect, afterEach } from 'vitest';
import yaml from 'js-yaml';
import type {
  ProjectId,
  ProjectEntry,
  DeliveryState,
  ExecutionPlan,
  Result,
} from '../../shared/types.js';
import { ok, err, createProjectId } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
  type FeatureArtifactDeps,
} from '../index.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

const makeState = (): DeliveryState => ({
  schema_version: '1.0',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  plan_path: '.nw-teams/plan.yaml',
  current_layer: 1,
  summary: { total_steps: 2, total_layers: 1, completed: 1, failed: 0, in_progress: 1 },
  steps: {
    '01-01': {
      step_id: '01-01',
      name: 'Setup auth',
      layer: 1,
      status: 'approved',
      teammate_id: 'crafter-01',
      started_at: '2026-03-01T01:00:00Z',
      completed_at: '2026-03-01T02:00:00Z',
      review_attempts: 1,
      files_to_modify: ['src/auth.ts'],
    },
    '01-02': {
      step_id: '01-02',
      name: 'Add login',
      layer: 1,
      status: 'in_progress',
      teammate_id: 'crafter-02',
      started_at: '2026-03-01T03:00:00Z',
      completed_at: null,
      review_attempts: 0,
      files_to_modify: ['src/login.ts'],
    },
  },
  teammates: {
    'crafter-01': { teammate_id: 'crafter-01', current_step: null, completed_steps: ['01-01'] },
    'crafter-02': { teammate_id: 'crafter-02', current_step: '01-02', completed_steps: [] },
  },
});

const makePlan = (): ExecutionPlan => ({
  schema_version: '1.0',
  summary: { total_steps: 2, total_layers: 1, max_parallelism: 2, requires_worktrees: true },
  layers: [{
    layer: 1,
    parallel: true,
    use_worktrees: true,
    steps: [
      { step_id: '01-01', name: 'Setup auth', files_to_modify: ['src/auth.ts'] },
      { step_id: '01-02', name: 'Add login', files_to_modify: ['src/login.ts'] },
    ],
  }],
});

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  state: makeState(),
  plan: makePlan(),
});

const stateToYaml = (state: DeliveryState): string => yaml.dump(state);
const planToYaml = (plan: ExecutionPlan): string => yaml.dump(plan);

// --- Dep factories ---

const makeFileStore = (files: Record<string, string>): FeatureArtifactDeps['readFile'] =>
  async (path: string): Promise<Result<string, string>> => {
    const content = files[path];
    return content !== undefined ? ok(content) : err(`ENOENT: ${path}`);
  };

const makeDeps = (overrides: {
  featureArtifacts?: FeatureArtifactDeps;
} = {}): MultiProjectHttpDeps => {
  const entries = new Map<ProjectId, ProjectEntry>();
  entries.set(projectAlpha, makeEntry(projectAlpha));

  return {
    listProjectSummaries: () => [],
    getProject: (id) => {
      const entry = entries.get(id);
      return entry ? ok(entry) : err({ type: 'project_not_found', projectId: id });
    },
    featureArtifacts: overrides.featureArtifacts,
  };
};

// =================================================================
// GET /api/projects/:id/features/:featureId/state
// =================================================================
describe('GET /api/projects/:id/features/:featureId/state', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns parsed execution-log.yaml as DeliveryState', async () => {
    const featureState = makeState();
    const files: Record<string, string> = {
      '/projects/alpha/docs/feature/auth-flow/execution-log.yaml': stateToYaml(featureState),
    };
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore(files),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/state`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body.schema_version).toBe('1.0');
    expect(body.summary.total_steps).toBe(2);
    expect(body.steps['01-01'].status).toBe('approved');
    expect(body.steps['01-02'].status).toBe('in_progress');
  });

  it('returns 404 when execution-log.yaml does not exist', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/state`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 404 when project is not found', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => undefined,
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/unknown/features/auth-flow/state`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid project ID', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/INVALID!/features/auth-flow/state`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid feature ID', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/INVALID!/state`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 422 for malformed execution-log YAML', async () => {
    const files: Record<string, string> = {
      '/projects/alpha/docs/feature/auth-flow/execution-log.yaml': 'not: valid: yaml: [',
    };
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore(files),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/state`,
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

// =================================================================
// GET /api/projects/:id/features/:featureId/plan
// =================================================================
describe('GET /api/projects/:id/features/:featureId/plan', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns parsed roadmap.yaml as ExecutionPlan', async () => {
    const featurePlan = makePlan();
    const files: Record<string, string> = {
      '/projects/alpha/docs/feature/auth-flow/roadmap.yaml': planToYaml(featurePlan),
    };
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore(files),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/plan`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body.schema_version).toBe('1.0');
    expect(body.summary.total_steps).toBe(2);
    expect(body.layers).toHaveLength(1);
    expect(body.layers[0].steps).toHaveLength(2);
  });

  it('returns 404 when roadmap.yaml does not exist', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/plan`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('returns error diagnostic for malformed roadmap YAML', async () => {
    const files: Record<string, string> = {
      '/projects/alpha/docs/feature/auth-flow/roadmap.yaml': '{ broken yaml',
    };
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore(files),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/plan`,
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.diagnostic).toBeDefined();
  });

  it('returns error diagnostic for schema-invalid roadmap', async () => {
    const files: Record<string, string> = {
      '/projects/alpha/docs/feature/auth-flow/roadmap.yaml': yaml.dump({ schema_version: '1.0' }),
    };
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore(files),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/plan`,
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.diagnostic).toBeDefined();
  });

  it('returns 404 when project is not found', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => undefined,
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/unknown/features/auth-flow/plan`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid project ID', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/INVALID!/features/auth-flow/plan`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid feature ID', async () => {
    const deps = makeDeps({
      featureArtifacts: {
        getProjectPath: () => '/projects/alpha',
        readFile: makeFileStore({}),
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/INVALID!/plan`,
    );

    expect(response.status).toBe(400);
  });
});

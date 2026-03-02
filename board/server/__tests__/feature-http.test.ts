/**
 * HTTP endpoint tests: Feature discovery route
 *
 * Tests the Express route handler for:
 *   GET /api/projects/:id/features
 *
 * Stubs injected via MultiProjectHttpDeps.discoverFeatures — no filesystem access.
 * Pure functions (deriveFeatureSummary) run for real.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { ProjectId, ProjectEntry, FeatureId, FeatureSummary, DeliveryState, ExecutionPlan } from '../../shared/types.js';
import { ok, err, createProjectId } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
} from '../index.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

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

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  state: makeState(),
  plan: makePlan(),
});

const makeFeatureSummary = (
  featureId: string,
  opts: { hasRoadmap: boolean; totalSteps: number },
): FeatureSummary => ({
  featureId: featureId as FeatureId,
  name: featureId,
  hasRoadmap: opts.hasRoadmap,
  hasExecutionLog: false,
  totalSteps: opts.totalSteps,
  completed: 0,
  inProgress: 0,
  failed: 0,
  currentLayer: 0,
  updatedAt: '',
});

const makeDeps = (overrides: Partial<MultiProjectHttpDeps> = {}): MultiProjectHttpDeps => {
  const entries = new Map<ProjectId, ProjectEntry>();
  entries.set(projectAlpha, makeEntry(projectAlpha));

  return {
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
    ...overrides,
  };
};

// =================================================================
// GET /api/projects/:id/features
// =================================================================
describe('GET /api/projects/:id/features', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns FeatureSummary[] with correct metrics for features with roadmap', async () => {
    const features: readonly FeatureSummary[] = [
      makeFeatureSummary('auth-flow', { hasRoadmap: true, totalSteps: 5 }),
      makeFeatureSummary('user-profile', { hasRoadmap: true, totalSteps: 3 }),
    ];
    const deps = makeDeps({
      discoverFeatures: async () => features,
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/features`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].featureId).toBe('auth-flow');
    expect(body[0].hasRoadmap).toBe(true);
    expect(body[0].totalSteps).toBe(5);
    expect(body[1].featureId).toBe('user-profile');
    expect(body[1].hasRoadmap).toBe(true);
    expect(body[1].totalSteps).toBe(3);
  });

  it('returns hasRoadmap false and 0 steps for feature without roadmap', async () => {
    const features: readonly FeatureSummary[] = [
      makeFeatureSummary('no-roadmap-feature', { hasRoadmap: false, totalSteps: 0 }),
    ];
    const deps = makeDeps({
      discoverFeatures: async () => features,
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/features`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].hasRoadmap).toBe(false);
    expect(body[0].totalSteps).toBe(0);
  });

  it('returns 404 when project not found', async () => {
    const deps = makeDeps({
      discoverFeatures: async () => [],
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/unknown/features`);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 400 for invalid project ID', async () => {
    const deps = makeDeps({
      discoverFeatures: async () => [],
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/INVALID!/features`);

    expect(response.status).toBe(400);
  });
});

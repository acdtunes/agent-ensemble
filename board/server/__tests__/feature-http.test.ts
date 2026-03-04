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
import type { ProjectId, ProjectEntry, FeatureId, FeatureSummary, Roadmap, RoadmapStep } from '../../shared/types.js';
import { ok, err, createProjectId, computeRoadmapSummary } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
} from '../index.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

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

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  roadmap: makeRoadmap(),
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
  done: 0,
  inProgress: 0,
  currentLayer: 0,
  updatedAt: '',
});

const makeDeps = (overrides: Partial<MultiProjectHttpDeps> = {}): MultiProjectHttpDeps => {
  const entries = new Map<ProjectId, ProjectEntry>();
  entries.set(projectAlpha, makeEntry(projectAlpha));

  return {
    listProjectSummaries: () =>
      [...entries.values()].map((e) => {
        const summary = computeRoadmapSummary(e.roadmap);
        return {
          projectId: e.projectId,
          name: e.projectId as string,
          totalSteps: summary.total_steps,
          done: summary.done,
          inProgress: summary.in_progress,
          currentLayer: 1,
          updatedAt: e.roadmap.roadmap.created_at ?? '',
          featureCount: 0,
          features: [],
        };
      }),
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

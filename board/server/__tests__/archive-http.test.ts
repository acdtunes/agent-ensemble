/**
 * Acceptance tests: Feature Archive HTTP Endpoints
 *
 * Tests the Express route handlers for:
 *   POST /api/projects/:id/features/:featureId/archive
 *   POST /api/projects/:id/archive/:featureId/restore
 *   GET  /api/projects/:id/archive
 *
 * Stubs injected via MultiProjectHttpDeps — no filesystem access.
 * Pure functions run for real.
 *
 * Gherkin reference: US-01, US-02, US-03 scenarios
 */

import { describe, it, expect, afterEach } from 'vitest';
import type {
  ProjectId,
  ProjectEntry,
  FeatureId,
  Roadmap,
  Result,
  ArchiveError as SharedArchiveError,
  RestoreError as SharedRestoreError,
} from '../../shared/types.js';
import { ok, err, createProjectId, computeRoadmapSummary } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
} from '../index.js';

// --- Archive-specific types (re-export from shared/types.ts) ---

// Using canonical types from shared/types.ts
type ArchiveError = SharedArchiveError;
type RestoreError = SharedRestoreError;

interface ArchivedFeature {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly archivedAt: string;
}

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

const makeRoadmap = (): Roadmap => ({
  roadmap: { project_id: 'alpha', created_at: '2026-03-01T00:00:00Z' },
  phases: [],
});

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  roadmap: makeRoadmap(),
});

const makeArchivedFeature = (featureId: string, archivedAt: string): ArchivedFeature => ({
  featureId: featureId as FeatureId,
  name: featureId,
  archivedAt,
});

// --- Mock deps factory ---

interface MockArchiveState {
  activeFeatures: Set<string>;
  archivedFeatures: Map<string, ArchivedFeature>;
}

const createMockState = (): MockArchiveState => ({
  activeFeatures: new Set(['auth-system', 'user-profile']),
  archivedFeatures: new Map([
    ['old-poc', makeArchivedFeature('old-poc', '2026-02-15T10:00:00.000Z')],
    ['abandoned', makeArchivedFeature('abandoned', '2026-02-20T14:30:00.000Z')],
  ]),
});

const makeDeps = (
  state: MockArchiveState = createMockState(),
  overrides: Partial<MultiProjectHttpDeps> = {},
): MultiProjectHttpDeps => {
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
          currentLayer: 0,
          updatedAt: e.roadmap.roadmap.created_at ?? '',
          featureCount: state.activeFeatures.size,
          features: [],
        };
      }),
    getProject: (id) => {
      const entry = entries.get(id);
      return entry ? ok(entry) : err({ type: 'project_not_found', projectId: id });
    },
    // Archive deps will be added when routes are implemented
    ...overrides,
  };
};

// =================================================================
// US-01: Archive a Feature
// =================================================================

describe('US-01: POST /api/projects/:id/features/:featureId/archive', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // Scenario 1.1: Archive existing feature
  it('Given feature "auth-system" exists, When POST /archive, Then 204 and feature moved', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        archiveFeature: async (_pId, fId): Promise<Result<void, ArchiveError>> => {
          if (!state.activeFeatures.has(fId as string)) {
            return err({ type: 'feature_not_found', featureId: fId });
          }
          state.activeFeatures.delete(fId as string);
          state.archivedFeatures.set(fId as string, makeArchivedFeature(fId as string, new Date().toISOString()));
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-system/archive`,
      { method: 'POST' },
    );

    expect(response.status).toBe(204);
    expect(state.activeFeatures.has('auth-system')).toBe(false);
    expect(state.archivedFeatures.has('auth-system')).toBe(true);
  });

  // Scenario 1.2: Archive non-existent feature
  it('Given feature "unknown" does not exist, When POST /archive, Then 404', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        archiveFeature: async (_pId, fId): Promise<Result<void, ArchiveError>> => {
          if (!state.activeFeatures.has(fId as string)) {
            return err({ type: 'feature_not_found', featureId: fId });
          }
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/unknown/archive`,
      { method: 'POST' },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  // Scenario 1.3: Archive already archived feature
  it('Given feature already in archive, When POST /archive, Then 409', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        archiveFeature: async (_pId, fId): Promise<Result<void, ArchiveError>> => {
          if (state.archivedFeatures.has(fId as string)) {
            return err({ type: 'already_archived', featureId: fId });
          }
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/old-poc/archive`,
      { method: 'POST' },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already archived/i);
  });

  // Scenario 1.4: Filesystem error during archive
  it('Given filesystem error occurs, When POST /archive, Then 500 with error message', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        archiveFeature: async (): Promise<Result<void, ArchiveError>> => {
          return err({ type: 'io_error', message: 'Permission denied: /archive' });
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-system/archive`,
      { method: 'POST' },
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/Permission denied/i);
  });

  // Scenario 1.5: Invalid feature ID format
  it.skip('Given invalid feature ID "INVALID!", When POST /archive, Then 400', async () => {
    const deps = makeDeps();
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/INVALID!/archive`,
      { method: 'POST' },
    );

    expect(response.status).toBe(400);
  });
});

// =================================================================
// US-02: View Archived Features
// =================================================================

describe('US-02: GET /api/projects/:id/archive', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // Scenario 2.1: List archived features
  it('Given 2 features in archive, When GET /archive, Then returns both with timestamps', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        listArchivedFeatures: async () => [...state.archivedFeatures.values()],
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/archive`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedFeatures).toHaveLength(2);
    expect(body.archivedFeatures[0].featureId).toBe('old-poc');
    expect(body.archivedFeatures[0].archivedAt).toBeDefined();
  });

  // Scenario 2.2: Empty archive
  it('Given no archived features, When GET /archive, Then returns empty array', async () => {
    const state: MockArchiveState = {
      activeFeatures: new Set(['feature-1']),
      archivedFeatures: new Map(),
    };
    const deps = makeDeps(state, {
      archive: {
        listArchivedFeatures: async () => [],
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/archive`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedFeatures).toHaveLength(0);
  });

  // Scenario 2.3: Project not found
  it('Given unknown project, When GET /archive, Then 404', async () => {
    const deps = makeDeps(createMockState(), {
      archive: {
        listArchivedFeatures: async () => [],
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/unknown/archive`);

    expect(response.status).toBe(404);
  });
});

// =================================================================
// US-03: Restore an Archived Feature
// =================================================================

describe('US-03: POST /api/projects/:id/archive/:featureId/restore', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // Scenario 3.1: Restore archived feature
  it('Given feature "old-poc" in archive, When POST /restore, Then 204 and feature restored', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        restoreFeature: async (_pId, fId): Promise<Result<void, RestoreError>> => {
          if (!state.archivedFeatures.has(fId as string)) {
            return err({ type: 'feature_not_found', featureId: fId });
          }
          state.archivedFeatures.delete(fId as string);
          state.activeFeatures.add(fId as string);
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/archive/old-poc/restore`,
      { method: 'POST' },
    );

    expect(response.status).toBe(204);
    expect(state.archivedFeatures.has('old-poc')).toBe(false);
    expect(state.activeFeatures.has('old-poc')).toBe(true);
  });

  // Scenario 3.2: Restore non-existent feature
  it('Given feature not in archive, When POST /restore, Then 404', async () => {
    const state = createMockState();
    const deps = makeDeps(state, {
      archive: {
        restoreFeature: async (_pId, fId): Promise<Result<void, RestoreError>> => {
          if (!state.archivedFeatures.has(fId as string)) {
            return err({ type: 'feature_not_found', featureId: fId });
          }
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/archive/unknown/restore`,
      { method: 'POST' },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  // Scenario 3.3: Restore conflicts with active feature
  it('Given feature already exists in active, When POST /restore, Then 409', async () => {
    const state = createMockState();
    // Add auth-system to both (simulating edge case)
    state.archivedFeatures.set('auth-system', makeArchivedFeature('auth-system', '2026-03-01T00:00:00.000Z'));

    const deps = makeDeps(state, {
      archive: {
        restoreFeature: async (_pId, fId): Promise<Result<void, RestoreError>> => {
          if (state.activeFeatures.has(fId as string)) {
            return err({ type: 'already_exists', featureId: fId });
          }
          return ok(undefined);
        },
      },
    });
    const app = createMultiProjectHttpApp(deps);
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/archive/auth-system/restore`,
      { method: 'POST' },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
  });
});

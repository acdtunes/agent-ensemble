/**
 * HTTP endpoint tests: Feature-scoped doc tree + doc content routes
 *
 * Tests the Express route handlers for:
 *   GET /api/projects/:id/features/:featureId/docs/tree
 *   GET /api/projects/:id/features/:featureId/docs/content?path=...
 *
 * Stubs injected via DocHttpDeps — no filesystem access.
 * Pure functions (validateDocPath, buildDocTree) run for real.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { ProjectId, FeatureId, DirEntry, Result } from '../../shared/types.js';
import { ok, err, createProjectId, createFeatureId } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
  type DocHttpDeps,
} from '../index.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;
const featureAuth = (createFeatureId('auth-flow') as { ok: true; value: FeatureId }).value;

const stubFeatureDocsRoot = '/fake/projects/alpha/docs/feature/auth-flow';

const makeDocDeps = (overrides: Partial<DocHttpDeps> = {}): DocHttpDeps => ({
  getDocsRoot: () => undefined,
  getFeatureDocsRoot: (id, fid) =>
    id === projectAlpha && fid === featureAuth ? stubFeatureDocsRoot : undefined,
  scanDocsDir: async () =>
    ok([
      { name: 'requirements.md', path: 'requirements.md', isDirectory: false },
      { name: 'adrs', path: 'adrs', isDirectory: true },
      { name: 'ADR-001.md', path: 'adrs/ADR-001.md', isDirectory: false },
    ] as readonly DirEntry[]),
  readDocContent: async () => ok('# Auth Flow\n\nFeature documentation.'),
  ...overrides,
});

const makeDeps = (docDeps?: DocHttpDeps): MultiProjectHttpDeps => ({
  listProjectSummaries: () => [],
  getProject: () => err({ type: 'not_found' }),
  docs: docDeps,
});

// =================================================================
// GET /api/projects/:id/features/:featureId/docs/tree
// =================================================================
describe('GET /api/projects/:id/features/:featureId/docs/tree', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns DocTree JSON scoped to feature directory', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/tree`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.root).toBeDefined();
    expect(body.fileCount).toBe(2);
  });

  it('returns 400 for invalid project ID', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/INVALID!/features/auth-flow/docs/tree`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid feature ID', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/INVALID!/docs/tree`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when feature docs root not found', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/unknown-feature/docs/tree`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when feature docs directory not found on disk', async () => {
    const docDeps = makeDocDeps({
      scanDocsDir: async () => err({ type: 'not_found', path: stubFeatureDocsRoot }),
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/tree`,
    );

    expect(response.status).toBe(404);
  });
});

// =================================================================
// GET /api/projects/:id/features/:featureId/docs/content?path=...
// =================================================================
describe('GET /api/projects/:id/features/:featureId/docs/content', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns markdown content for valid path within feature directory', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/content?path=requirements.md`,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# Auth Flow');
  });

  it('returns 400 for invalid project ID', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/INVALID!/features/auth-flow/docs/content?path=requirements.md`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid feature ID', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/INVALID!/docs/content?path=requirements.md`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when path parameter is missing', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/content`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for path traversal attempt', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/content?path=../../../etc/passwd`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when feature docs root not found', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/unknown-feature/docs/content?path=requirements.md`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when document not found', async () => {
    const docDeps = makeDocDeps({
      readDocContent: async () =>
        err({ type: 'not_found', path: `${stubFeatureDocsRoot}/missing.md` }),
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/auth-flow/docs/content?path=missing.md`,
    );

    expect(response.status).toBe(404);
  });
});

/**
 * HTTP endpoint tests: Doc tree + doc content routes
 *
 * Tests the Express route handlers for:
 *   GET /api/projects/:id/docs/tree
 *   GET /api/projects/:id/docs/content?path=...
 *
 * Stubs injected via DocHttpDeps — no filesystem access.
 * Pure functions (validateDocPath, buildDocTree) run for real.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { ProjectId, DirEntry, DocTreeError, DocContentError, Result } from '../../shared/types.js';
import { ok, err, createProjectId } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
  type DocHttpDeps,
} from '../index.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;

const stubDocsRoot = '/fake/docs';

const makeDocDeps = (overrides: Partial<DocHttpDeps> = {}): DocHttpDeps => ({
  getDocsRoot: (id) => (id === projectAlpha ? stubDocsRoot : undefined),
  scanDocsDir: async () =>
    ok([
      { name: 'README.md', path: 'README.md', isDirectory: false },
      { name: 'adrs', path: 'adrs', isDirectory: true },
      { name: 'ADR-001.md', path: 'adrs/ADR-001.md', isDirectory: false },
    ] as readonly DirEntry[]),
  readDocContent: async () => ok('# Hello World\n\nSome content.'),
  ...overrides,
});

const makeDeps = (docDeps?: DocHttpDeps): MultiProjectHttpDeps => ({
  listProjectSummaries: () => [],
  getProject: () => err({ type: 'not_found' }),
  docs: docDeps,
});

// =================================================================
// GET /api/projects/:id/docs/tree
// =================================================================
describe('GET /api/projects/:id/docs/tree', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns DocTree JSON for valid project with docs root', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/docs/tree`);

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
      `http://localhost:${server.port}/api/projects/INVALID!/docs/tree`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when project has no docs root', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/unknown/docs/tree`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when docs directory not found on disk', async () => {
    const docDeps = makeDocDeps({
      scanDocsDir: async () => err({ type: 'not_found', path: stubDocsRoot }),
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/docs/tree`,
    );

    expect(response.status).toBe(404);
  });
});

// =================================================================
// GET /api/projects/:id/docs/content?path=...
// =================================================================
describe('GET /api/projects/:id/docs/content', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns markdown content for valid path', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/docs/content?path=README.md`,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# Hello World');
  });

  it('returns 400 for invalid project ID', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/INVALID!/docs/content?path=README.md`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when path parameter is missing', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/docs/content`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for path traversal attempt', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/docs/content?path=../../../etc/passwd`,
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when project has no docs root', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/unknown/docs/content?path=README.md`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when document not found', async () => {
    const docDeps = makeDocDeps({
      readDocContent: async () =>
        err({ type: 'not_found', path: '/fake/docs/missing.md' }),
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/docs/content?path=missing.md`,
    );

    expect(response.status).toBe(404);
  });
});

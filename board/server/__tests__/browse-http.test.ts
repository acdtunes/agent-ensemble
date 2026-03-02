/**
 * HTTP endpoint tests: Directory browser route
 *
 * Tests the Express route handler for:
 *   GET /api/browse?path=...
 *
 * Stubs injected via BrowseHttpDeps — no filesystem access.
 * Pure function (validateBrowsePath) runs for real.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { BrowseEntry, BrowseError, Result } from '../../shared/types.js';
import { ok, err } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
  type BrowseHttpDeps,
} from '../index.js';

// --- Fixtures ---

const makeBrowseDeps = (overrides: Partial<BrowseHttpDeps> = {}): BrowseHttpDeps => ({
  listDirectories: async () =>
    ok([
      { name: 'documents', path: '/home/user/documents' },
      { name: 'projects', path: '/home/user/projects' },
    ] as BrowseEntry[]),
  defaultPath: () => '/home/user',
  ...overrides,
});

const makeDeps = (browseDeps?: BrowseHttpDeps): MultiProjectHttpDeps => ({
  listProjectSummaries: () => [],
  getProject: () => err({ type: 'not_found' }),
  browse: browseDeps,
});

// =================================================================
// GET /api/browse
// =================================================================
describe('GET /api/browse', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns 200 with path, parent, and entries on success', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeBrowseDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=/home/user`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toBe('/home/user');
    expect(body.parent).toBe('/home');
    expect(body.entries).toEqual([
      { name: 'documents', path: '/home/user/documents' },
      { name: 'projects', path: '/home/user/projects' },
    ]);
  });

  it('uses defaultPath when path query param is omitted', async () => {
    const browseDeps = makeBrowseDeps({
      defaultPath: () => '/default/path',
      listDirectories: async (p) =>
        ok([{ name: 'child', path: `${p}/child` }]),
    });
    const app = createMultiProjectHttpApp(makeDeps(browseDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/browse`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toBe('/default/path');
  });

  it('returns null parent at filesystem root', async () => {
    const browseDeps = makeBrowseDeps({
      listDirectories: async () => ok([]),
    });
    const app = createMultiProjectHttpApp(makeDeps(browseDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=/`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toBe('/');
    expect(body.parent).toBeNull();
  });

  it('returns 400 for invalid path', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeBrowseDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=relative/path`,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 403 for permission_denied errors', async () => {
    const browseDeps = makeBrowseDeps({
      listDirectories: async () =>
        err({ type: 'permission_denied', path: '/restricted' } as BrowseError),
    });
    const app = createMultiProjectHttpApp(makeDeps(browseDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=/restricted`,
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 404 for not_found errors', async () => {
    const browseDeps = makeBrowseDeps({
      listDirectories: async () =>
        err({ type: 'not_found', path: '/missing' } as BrowseError),
    });
    const app = createMultiProjectHttpApp(makeDeps(browseDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=/missing`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 500 for read_failed errors', async () => {
    const browseDeps = makeBrowseDeps({
      listDirectories: async () =>
        err({ type: 'read_failed', message: 'Disk error' } as BrowseError),
    });
    const app = createMultiProjectHttpApp(makeDeps(browseDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/browse?path=/some/dir`,
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('does not register route when browse deps are not provided', async () => {
    const app = createMultiProjectHttpApp(makeDeps());
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(`http://localhost:${server.port}/api/browse`);

    expect(response.status).toBe(404);
  });
});

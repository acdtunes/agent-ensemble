/**
 * HTTP endpoint tests: Feature-scoped multi-root doc tree
 *
 * Tests the Express route handler for:
 *   GET /api/projects/:id/features/:featureId/docs/tree
 *
 * When a feature has docs in multiple directories (feature, ux, requirements),
 * the endpoint returns a MultiRootDocTree with all roots merged.
 *
 * Stubs injected via DocHttpDeps - no filesystem access.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { ProjectId, FeatureId, DirEntry, MultiRootDocTree } from '../../shared/types.js';
import { ok, err, createProjectId, createFeatureId } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
  type DocHttpDeps,
} from '../index.js';
import type { LabeledRoot } from '../feature-docs-root.js';

// --- Fixtures ---

const projectAlpha = (createProjectId('alpha') as { ok: true; value: ProjectId }).value;
const featurePackaging = (createFeatureId('packaging') as { ok: true; value: FeatureId }).value;

const allRoots: LabeledRoot[] = [
  { label: 'feature', root: '/fake/projects/alpha/docs/feature/packaging' },
  { label: 'ux', root: '/fake/projects/alpha/docs/ux/packaging' },
  { label: 'requirements', root: '/fake/projects/alpha/docs/requirements/packaging' },
];

const entriesByRoot: Record<string, readonly DirEntry[]> = {
  '/fake/projects/alpha/docs/feature/packaging': [
    { name: 'overview.md', path: 'overview.md', isDirectory: false },
  ],
  '/fake/projects/alpha/docs/ux/packaging': [
    { name: 'jtbd.md', path: 'jtbd.md', isDirectory: false },
    { name: 'journey-map.md', path: 'journey-map.md', isDirectory: false },
  ],
  '/fake/projects/alpha/docs/requirements/packaging': [
    { name: 'user-stories.md', path: 'user-stories.md', isDirectory: false },
    { name: 'acceptance-criteria.md', path: 'acceptance-criteria.md', isDirectory: false },
  ],
};

const makeMultiRootDocDeps = (overrides: Partial<DocHttpDeps> = {}): DocHttpDeps => ({
  getDocsRoot: () => undefined,
  getAllFeatureDocsRoots: (id, fid) =>
    id === projectAlpha && fid === featurePackaging ? allRoots : [],
  scanDocsDir: async (root) =>
    ok(entriesByRoot[root] ?? []),
  readDocContent: async () => ok('# Doc content'),
  ...overrides,
});

const makeDeps = (docDeps?: DocHttpDeps): MultiProjectHttpDeps => ({
  listProjectSummaries: () => [],
  getProject: () => err({ type: 'not_found' }),
  docs: docDeps,
});

// =================================================================
// GET /api/projects/:id/features/:featureId/docs/tree (Multi-root)
// =================================================================
describe('GET /api/projects/:id/features/:featureId/docs/tree (multi-root)', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns MultiRootDocTree with all labeled roots when feature has docs in multiple directories', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeMultiRootDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/packaging/docs/tree`,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as MultiRootDocTree;

    // Should have multiple roots with labels
    expect(body.roots).toHaveLength(3);
    expect(body.roots[0].label).toBe('feature');
    expect(body.roots[0].fileCount).toBe(1);
    expect(body.roots[1].label).toBe('ux');
    expect(body.roots[1].fileCount).toBe(2);
    expect(body.roots[2].label).toBe('requirements');
    expect(body.roots[2].fileCount).toBe(2);

    // Total file count across all roots
    expect(body.totalFileCount).toBe(5);
  });

  it('returns 404 when feature has no docs in any directory', async () => {
    const docDeps = makeMultiRootDocDeps({
      getAllFeatureDocsRoots: () => [],
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/unknown-feature/docs/tree`,
    );

    expect(response.status).toBe(404);
  });

  it('returns MultiRootDocTree with single root for backward compatibility', async () => {
    const singleRootDeps = makeMultiRootDocDeps({
      getAllFeatureDocsRoots: (id, fid) =>
        id === projectAlpha && fid === featurePackaging
          ? [{ label: 'feature', root: '/fake/projects/alpha/docs/feature/packaging' }]
          : [],
    });
    const app = createMultiProjectHttpApp(makeDeps(singleRootDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/packaging/docs/tree`,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as MultiRootDocTree;

    expect(body.roots).toHaveLength(1);
    expect(body.roots[0].label).toBe('feature');
    expect(body.totalFileCount).toBe(1);
  });
});

// =================================================================
// GET /api/projects/:id/features/:featureId/docs/content (Multi-root)
// =================================================================
describe('GET /api/projects/:id/features/:featureId/docs/content (multi-root)', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns content when path includes label prefix (e.g., ux/jtbd.md)', async () => {
    const docDeps = makeMultiRootDocDeps({
      readDocContent: async () => ok('# JTBD Analysis\n\nUser needs...'),
    });
    const app = createMultiProjectHttpApp(makeDeps(docDeps));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/packaging/docs/content?path=ux/jtbd.md`,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# JTBD Analysis');
  });

  it('returns 400 when path has no label prefix', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeMultiRootDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/packaging/docs/content?path=jtbd.md`,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid path format');
  });

  it('returns 404 when label does not match any root', async () => {
    const app = createMultiProjectHttpApp(makeDeps(makeMultiRootDocDeps()));
    server = createHttpServer(app, 0);
    await server.ready;

    const response = await fetch(
      `http://localhost:${server.port}/api/projects/alpha/features/packaging/docs/content?path=unknown/file.md`,
    );

    expect(response.status).toBe(404);
  });
});

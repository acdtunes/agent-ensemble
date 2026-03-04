import { describe, it, expect, afterEach } from 'vitest';
import type {
  Roadmap,
  ProjectId,
  ProjectEntry,
  ProjectSummary,
  AddProjectError,
  RemoveProjectError,
  Result,
} from '../../shared/types.js';
import { ok, err, deriveProjectSummary } from '../../shared/types.js';
import {
  createMultiProjectHttpApp,
  createHttpServer,
  type HttpServer,
  type MultiProjectHttpDeps,
} from '../index.js';

// --- Fixtures ---

const makeProjectId = (id: string): ProjectId => id as ProjectId;

const makeRoadmap = (): Roadmap => ({
  roadmap: {},
  phases: [],
});

const makeEntry = (id: string): ProjectEntry => ({
  projectId: makeProjectId(id),
  roadmap: makeRoadmap(),
});

// --- Deps factory using in-memory store ---

const createTestDeps = (entries: ProjectEntry[] = []): MultiProjectHttpDeps => {
  const store = new Map<ProjectId, ProjectEntry>(
    entries.map((e) => [e.projectId, e]),
  );

  return {
    getProject: (projectId: ProjectId): Result<ProjectEntry, string> => {
      const entry = store.get(projectId);
      return entry ? ok(entry) : err(`Not found: ${projectId}`);
    },
    listProjectSummaries: (): readonly ProjectSummary[] =>
      [...store.values()].map((e) => deriveProjectSummary(e.projectId, e.roadmap)),
  };
};

// --- Feature artifact deps factory ---

const createFeatureArtifactDeps = (
  projectPaths: Record<string, string>,
  fileContents: Record<string, Result<string, string>>,
): MultiProjectHttpDeps => ({
  ...createTestDeps([]),
  featureArtifacts: {
    getProjectPath: (projectId: ProjectId): string | undefined =>
      projectPaths[projectId as string],
    readFile: async (path: string): Promise<Result<string, string>> =>
      fileContents[path] ?? err(`File not found: ${path}`),
  },
});

// --- Project ops deps factory ---

const makeSummary = (id: string): ProjectSummary => ({
  projectId: makeProjectId(id),
  name: id,
  totalSteps: 1,
  completed: 0,
  failed: 0,
  inProgress: 0,
  currentLayer: 0,
  updatedAt: '',
  featureCount: 0,
  features: [],
});

const createTestDepsWithProjectOps = (ops: {
  addProject?: (path: string) => Promise<Result<ProjectSummary, AddProjectError>>;
  removeProject?: (projectId: ProjectId) => Promise<Result<void, RemoveProjectError>>;
}): MultiProjectHttpDeps => ({
  ...createTestDeps([]),
  ...ops,
});

// --- Tests ---

describe('Multi-project HTTP endpoints', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  describe('GET /api/projects', () => {
    it('should return list of ProjectSummary for all registered projects', async () => {
      const deps = createTestDeps([makeEntry('proj-1'), makeEntry('proj-2')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      const body = await response.json();
      expect(body).toHaveLength(2);
      const ids = body.map((p: ProjectSummary) => p.projectId).sort();
      expect(ids).toEqual(['proj-1', 'proj-2']);
    });

    it('should return empty array when no projects registered', async () => {
      const deps = createTestDeps([]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/projects/:id/features/:featureId/roadmap', () => {
    const validRoadmapYaml = [
      'roadmap:',
      '  project_id: test-project',
      "  created_at: '2026-03-01T00:00:00Z'",
      '  total_steps: 2',
      '  phases: 1',
      'phases:',
      "- id: '01'",
      '  name: Phase 1',
      '  steps:',
      '  - id: 01-01',
      '    name: Step one',
      '    files_to_modify: []',
      '    dependencies: []',
      '    criteria: []',
      '    status: approved',
      '    teammate_id: crafter-01',
      "    started_at: '2026-03-01T00:00:00Z'",
      "    completed_at: '2026-03-01T01:00:00Z'",
      '    review_attempts: 1',
      '  - id: 01-02',
      '    name: Step two',
      '    files_to_modify:',
      '      - src/foo.ts',
      '    dependencies:',
      '      - 01-01',
      '    criteria:',
      '      - Must do X',
      '    status: in_progress',
      '    teammate_id: crafter-02',
      "    started_at: '2026-03-01T02:00:00Z'",
      '    review_attempts: 0',
    ].join('\n');

    it('should return parsed roadmap with computed summary', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        { '/fake/test-proj/docs/feature/my-feature/roadmap.yaml': ok(validRoadmapYaml) },
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.roadmap.project_id).toBe('test-project');
      expect(body.phases).toHaveLength(1);
      expect(body.phases[0].steps).toHaveLength(2);
      expect(body.summary).toEqual({
        total_steps: 2,
        total_phases: 1,
        done: 1,
        in_progress: 1,
        pending: 0,
      });
    });

    it('should return 404 when roadmap.yaml not found', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        {},
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toMatch(/not found/i);
    });

    it('should return 422 when roadmap.yaml is malformed', async () => {
      const deps = createFeatureArtifactDeps(
        { 'test-proj': '/fake/test-proj' },
        { '/fake/test-proj/docs/feature/my-feature/roadmap.yaml': ok('roadmap: {}') },
      );
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(
        `http://localhost:${server.port}/api/projects/test-proj/features/my-feature/roadmap`,
      );

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toMatch(/malformed/i);
    });
  });

  describe('Removed endpoints', () => {
    it('should return 404 for removed /state endpoint', async () => {
      const deps = createTestDeps([makeEntry('alpha')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/state`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for removed /plan endpoint', async () => {
      const deps = createTestDeps([makeEntry('alpha')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      const response = await fetch(`http://localhost:${server.port}/api/projects/alpha/plan`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects', () => {
    it('should return 201 with ProjectSummary for valid path', async () => {
      const summary = makeSummary('alpha');
      const deps = createTestDepsWithProjectOps({
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
      const deps = createTestDepsWithProjectOps({
        addProject: async () => ok(makeSummary('alpha')),
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
      const deps = createTestDepsWithProjectOps({
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
      const deps = createTestDepsWithProjectOps({
        addProject: async () => err({ type: 'duplicate' as const, projectId: makeProjectId('alpha') }),
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
    it('should return 204 when project is removed', async () => {
      const deps = createTestDepsWithProjectOps({
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
      const deps = createTestDepsWithProjectOps({
        removeProject: async () => err({ type: 'not_found' as const, projectId: makeProjectId('alpha') }),
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
      const deps = createTestDepsWithProjectOps({
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

  describe('HttpServer', () => {
    it('should start on configurable port', async () => {
      const deps = createTestDeps([makeEntry('test')]);
      const app = createMultiProjectHttpApp(deps);
      server = createHttpServer(app, 0);
      await server.ready;

      expect(server.port).toBeGreaterThan(0);

      const response = await fetch(`http://localhost:${server.port}/api/projects`);
      expect(response.status).toBe(200);
    });
  });
});

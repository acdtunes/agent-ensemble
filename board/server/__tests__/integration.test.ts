import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';
import type {
  ProjectId,
  ServerWSMessage,
  ClientWSMessage,
} from '../../shared/types.js';
import { createProjectId } from '../../shared/types.js';
import { createMultiProjectServer, type MultiProjectServer } from '../multi-project-server.js';

// --- Fixtures ---

const ROADMAP_YAML = `
roadmap:
  project_id: test
  created_at: "2026-03-01T00:00:00Z"
  total_steps: 1
  phases: 1
phases:
  - id: "01"
    name: "Phase 1"
    steps:
      - id: "01-01"
        name: "Test step"
        files_to_modify: []
        dependencies: []
        criteria: []
        status: "pending"
`;

const makeUpdatedRoadmapYaml = (status: string): string => `
roadmap:
  project_id: test
  created_at: "2026-03-01T00:00:00Z"
  total_steps: 1
  phases: 1
phases:
  - id: "01"
    name: "Phase 1"
    steps:
      - id: "01-01"
        name: "Test step"
        files_to_modify: []
        dependencies: []
        criteria: []
        status: "${status}"
        started_at: "2026-03-01T01:00:00Z"
`;

const forceProjectId = (raw: string): ProjectId => {
  const result = createProjectId(raw);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

// --- WS test client ---

interface TestClient {
  readonly ws: WebSocket;
  readonly messages: ServerWSMessage[];
  readonly waitForMessage: (count: number, timeoutMs?: number) => Promise<void>;
  readonly send: (msg: ClientWSMessage) => void;
  readonly close: () => void;
}

const connectTestClient = (port: number): Promise<TestClient> =>
  new Promise((resolve, reject) => {
    const messages: ServerWSMessage[] = [];
    let resolveWait: (() => void) | null = null;
    let waitTarget = 0;

    const ws = new WebSocket(`ws://localhost:${port}`);

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()) as ServerWSMessage);
      if (resolveWait && messages.length >= waitTarget) {
        resolveWait();
        resolveWait = null;
      }
    });

    const waitForMessage = (count: number, timeoutMs = 5000): Promise<void> => {
      if (messages.length >= count) return Promise.resolve();
      waitTarget = count;
      return new Promise((r, reject) => {
        resolveWait = r;
        setTimeout(() => reject(new Error(`Timed out waiting for message ${count}, got ${messages.length}`)), timeoutMs);
      });
    };

    const send = (msg: ClientWSMessage): void => {
      ws.send(JSON.stringify(msg));
    };

    ws.on('open', () => resolve({ ws, messages, waitForMessage, send, close: () => ws.close() }));
    ws.on('error', reject);
  });

const addProjectDir = async (rootDir: string, name: string): Promise<void> => {
  const projectDir = join(rootDir, name);
  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, 'roadmap.yaml'), ROADMAP_YAML.trim());
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// --- Integration tests ---

describe('Multi-project end-to-end integration', () => {
  let rootDir: string;
  let server: MultiProjectServer | null = null;
  const clients: TestClient[] = [];

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'integration-test-'));
  });

  afterEach(async () => {
    for (const c of clients) {
      if (c.ws.readyState === WebSocket.OPEN) c.close();
    }
    clients.length = 0;
    if (server) {
      await server.close();
      server = null;
    }
    await rm(rootDir, { recursive: true, force: true });
  });

  it('should discover existing projects on startup and serve them via WS', async () => {
    // Given: two project directories exist before server starts
    await addProjectDir(rootDir, 'project-alpha');
    await addProjectDir(rootDir, 'project-beta');

    // When: server starts and performs initial discovery
    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 500,
    });
    await server.ready;

    // Then: connecting client receives project_list with both projects
    const client = await connectTestClient(server.wsPort);
    clients.push(client);
    await client.waitForMessage(1);

    const msg = client.messages[0];
    expect(msg.type).toBe('project_list');
    if (msg.type !== 'project_list') return;
    expect(msg.projects).toHaveLength(2);
    const ids = msg.projects.map((p) => p.projectId).sort();
    expect(ids).toEqual(['project-alpha', 'project-beta']);
  });

  it('should surface a new project within poll interval when roadmap.yaml is added', async () => {
    // Given: server starts with one project
    await addProjectDir(rootDir, 'project-alpha');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 100,
    });
    await server.ready;

    const client = await connectTestClient(server.wsPort);
    clients.push(client);
    await client.waitForMessage(1);

    // Initial list has 1 project
    expect(client.messages[0].type).toBe('project_list');
    if (client.messages[0].type !== 'project_list') return;
    expect(client.messages[0].projects).toHaveLength(1);

    // When: a new project directory appears
    await addProjectDir(rootDir, 'project-beta');

    // Then: client receives updated project_list within poll interval
    await client.waitForMessage(2, 3000);

    const updateMsg = client.messages[1];
    expect(updateMsg.type).toBe('project_list');
    if (updateMsg.type !== 'project_list') return;
    expect(updateMsg.projects).toHaveLength(2);
    const ids = updateMsg.projects.map((p) => p.projectId).sort();
    expect(ids).toEqual(['project-alpha', 'project-beta']);
  });

  it('should deliver state update only to the subscribed project client', async () => {
    // Given: two projects exist and two clients each subscribe to one
    await addProjectDir(rootDir, 'project-alpha');
    await addProjectDir(rootDir, 'project-beta');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000, // long poll — not relevant here
    });
    await server.ready;

    const clientAlpha = await connectTestClient(server.wsPort);
    const clientBeta = await connectTestClient(server.wsPort);
    clients.push(clientAlpha, clientBeta);

    // Wait for project_list on both
    await Promise.all([
      clientAlpha.waitForMessage(1),
      clientBeta.waitForMessage(1),
    ]);

    // Subscribe each to different project
    clientAlpha.send({ type: 'subscribe', projectId: forceProjectId('project-alpha') });
    clientBeta.send({ type: 'subscribe', projectId: forceProjectId('project-beta') });

    // Wait for init messages
    await Promise.all([
      clientAlpha.waitForMessage(2),
      clientBeta.waitForMessage(2),
    ]);

    // When: project-alpha's roadmap.yaml is updated
    const alphaRoadmapPath = join(rootDir, 'project-alpha', 'roadmap.yaml');
    await writeFile(alphaRoadmapPath, makeUpdatedRoadmapYaml('in_progress'));

    // Then: only clientAlpha receives the update (watcher debounce + propagation)
    await clientAlpha.waitForMessage(3, 3000);
    await delay(300);

    const alphaUpdate = clientAlpha.messages[2];
    expect(alphaUpdate.type).toBe('update');
    if (alphaUpdate.type !== 'update') return;
    expect(alphaUpdate.projectId).toBe('project-alpha');
    expect(alphaUpdate.state.steps['01-01'].status).toBe('in_progress');

    // clientBeta still only has project_list + init (no update)
    expect(clientBeta.messages).toHaveLength(2);
  });

  it('should serve project state and plan via HTTP endpoints', async () => {
    // Given: a project exists
    await addProjectDir(rootDir, 'project-alpha');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: HTTP endpoints are queried
    const listResponse = await fetch(`http://localhost:${server.httpPort}/api/projects`);
    const stateResponse = await fetch(`http://localhost:${server.httpPort}/api/projects/project-alpha/state`);
    const planResponse = await fetch(`http://localhost:${server.httpPort}/api/projects/project-alpha/plan`);

    // Then: all return correct data
    expect(listResponse.status).toBe(200);
    const projects = await listResponse.json();
    expect(projects).toHaveLength(1);
    expect(projects[0].projectId).toBe('project-alpha');

    expect(stateResponse.status).toBe(200);
    const state = await stateResponse.json();
    expect(state.schema_version).toBe('1.0');

    expect(planResponse.status).toBe(200);
    const plan = await planResponse.json();
    expect(plan.schema_version).toBe('1.0');
    expect(plan.layers).toHaveLength(1);
  });

  it('should serve doc tree for project with docs directory', async () => {
    // Given: a project exists with a docs directory containing markdown files
    await addProjectDir(rootDir, 'project-alpha');
    const docsDir = join(rootDir, 'project-alpha', 'docs');
    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'README.md'), '# Project Alpha Docs');
    await mkdir(join(docsDir, 'adrs'), { recursive: true });
    await writeFile(join(docsDir, 'adrs', 'ADR-001.md'), '# ADR 001');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: doc tree endpoint is queried
    const response = await fetch(
      `http://localhost:${server.httpPort}/api/projects/project-alpha/docs/tree`,
    );

    // Then: returns DocTree with correct structure
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.fileCount).toBe(2);
    expect(body.root).toBeDefined();
  });

  it('should serve doc content for project with docs directory', async () => {
    // Given: a project with a docs directory containing a markdown file
    await addProjectDir(rootDir, 'project-alpha');
    const docsDir = join(rootDir, 'project-alpha', 'docs');
    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'guide.md'), '# Getting Started\n\nWelcome.');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: doc content endpoint is queried
    const response = await fetch(
      `http://localhost:${server.httpPort}/api/projects/project-alpha/docs/content?path=guide.md`,
    );

    // Then: returns markdown content
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# Getting Started');
  });

  it('should return directory listing from browse endpoint via real filesystem', async () => {
    // Given: server is running and the rootDir contains project directories
    await addProjectDir(rootDir, 'project-alpha');
    await addProjectDir(rootDir, 'project-beta');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: browse endpoint is queried with the rootDir path
    const response = await fetch(
      `http://localhost:${server.httpPort}/api/browse?path=${encodeURIComponent(rootDir)}`,
    );

    // Then: returns directory listing with both project directories
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toBe(rootDir);
    expect(body.parent).toBeDefined();
    expect(Array.isArray(body.entries)).toBe(true);
    const names = body.entries.map((e: { name: string }) => e.name).sort();
    expect(names).toContain('project-alpha');
    expect(names).toContain('project-beta');
  });

  it('should return default path listing when browse endpoint called without path', async () => {
    // Given: server is running
    await addProjectDir(rootDir, 'project-alpha');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: browse endpoint is queried without path parameter
    const response = await fetch(
      `http://localhost:${server.httpPort}/api/browse`,
    );

    // Then: returns 200 with the home directory listing
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toBeDefined();
    expect(Array.isArray(body.entries)).toBe(true);
  });

  it('should return 404 for doc endpoints when project has no docs directory', async () => {
    // Given: a project exists WITHOUT a docs directory
    await addProjectDir(rootDir, 'project-nodocs');

    server = createMultiProjectServer({
      projectsRoot: rootDir,
      wsPort: 0,
      httpPort: 0,
      pollIntervalMs: 5000,
    });
    await server.ready;

    // When: doc tree and content endpoints are queried
    const treeResponse = await fetch(
      `http://localhost:${server.httpPort}/api/projects/project-nodocs/docs/tree`,
    );
    const contentResponse = await fetch(
      `http://localhost:${server.httpPort}/api/projects/project-nodocs/docs/content?path=README.md`,
    );

    // Then: both return 404 with descriptive error messages
    expect(treeResponse.status).toBe(404);
    const treeBody = await treeResponse.json();
    expect(treeBody.error).toBeDefined();

    expect(contentResponse.status).toBe(404);
    const contentBody = await contentResponse.json();
    expect(contentBody.error).toBeDefined();
  });
});

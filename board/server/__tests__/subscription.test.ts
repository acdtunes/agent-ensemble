import { describe, it, expect, afterEach } from 'vitest';
import WebSocket from 'ws';
import type {
  Roadmap,
  RoadmapStep,
  RoadmapTransition,
  ProjectId,
  ProjectEntry,
  ProjectSummary,
  ServerWSMessage,
  ClientWSMessage,
} from '../../shared/types.js';
import { ok, err, createProjectId, deriveProjectSummary } from '../../shared/types.js';
import {
  createSubscriptionServer,
  type SubscriptionServer,
  type SubscriptionServerDeps,
} from '../index.js';

// --- Fixtures ---

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
  phases: [{ id: '01', name: 'Phase 1', steps: [makeStep()] }],
  ...overrides,
});

const projectAlpha = createProjectId('alpha') as { ok: true; value: ProjectId };
const projectBeta = createProjectId('beta') as { ok: true; value: ProjectId };

const makeEntry = (projectId: ProjectId): ProjectEntry => ({
  projectId,
  roadmap: makeRoadmap(),
});

const makeDeps = (entries: Map<ProjectId, ProjectEntry>): SubscriptionServerDeps => ({
  getProject: (id) => {
    const entry = entries.get(id);
    return entry ? ok(entry) : err({ type: 'project_not_found', projectId: id });
  },
  listProjectSummaries: () =>
    [...entries.values()].map((e) => deriveProjectSummary(e.projectId, e.roadmap)),
});

// --- Test helpers ---

interface TestClient {
  readonly ws: WebSocket;
  readonly messages: ServerWSMessage[];
  readonly waitForMessage: (count: number) => Promise<void>;
  readonly send: (msg: ClientWSMessage) => void;
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

    const waitForMessage = (count: number): Promise<void> => {
      if (messages.length >= count) return Promise.resolve();
      waitTarget = count;
      return new Promise((r) => { resolveWait = r; });
    };

    const send = (msg: ClientWSMessage): void => {
      ws.send(JSON.stringify(msg));
    };

    ws.on('open', () => resolve({ ws, messages, waitForMessage, send }));
    ws.on('error', reject);
  });

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('SubscriptionServer', () => {
  let server: SubscriptionServer | null = null;
  const testClients: TestClient[] = [];

  afterEach(async () => {
    for (const tc of testClients) {
      if (tc.ws.readyState === WebSocket.OPEN) tc.ws.close();
    }
    testClients.length = 0;
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should send projects_snapshot on initial connection', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    const msg = client.messages[0];
    expect(msg.type).toBe('project_list');
    if (msg.type !== 'project_list') return;
    expect(msg.projects).toHaveLength(1);
    expect(msg.projects[0].projectId).toBe('alpha');
  });

  it('should send init with roadmap on subscribe', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    client.send({ type: 'subscribe', projectId: projectAlpha.value });
    await client.waitForMessage(2);

    const msg = client.messages[1];
    expect(msg.type).toBe('init');
    if (msg.type !== 'init') return;
    expect(msg.projectId).toBe('alpha');
    expect(msg.roadmap).toEqual(makeRoadmap());
  });

  it('should broadcast update only to clients subscribed to that project', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    entries.set(projectBeta.value, makeEntry(projectBeta.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const clientA = await connectTestClient(server.port);
    const clientB = await connectTestClient(server.port);
    testClients.push(clientA, clientB);

    await Promise.all([clientA.waitForMessage(1), clientB.waitForMessage(1)]);

    // Client A subscribes to alpha, client B subscribes to beta
    clientA.send({ type: 'subscribe', projectId: projectAlpha.value });
    clientB.send({ type: 'subscribe', projectId: projectBeta.value });
    await Promise.all([clientA.waitForMessage(2), clientB.waitForMessage(2)]);

    // Notify update for alpha only
    const updatedRoadmap = makeRoadmap({
      phases: [{ id: '01', name: 'Phase 1', steps: [makeStep({ status: 'in_progress', started_at: '2026-03-01T01:00:00Z' })] }],
    });
    const transitions: readonly RoadmapTransition[] = [
      { step_id: '01-01', from_status: 'pending', to_status: 'in_progress', teammate_id: null, timestamp: '2026-03-01T01:00:00Z' },
    ];
    server.notifyProjectUpdate(projectAlpha.value, updatedRoadmap, transitions);

    await clientA.waitForMessage(3);
    await delay(100);

    // Client A got the update
    const msgA = clientA.messages[2];
    expect(msgA.type).toBe('update');
    if (msgA.type !== 'update') return;
    expect(msgA.projectId).toBe('alpha');
    expect(msgA.roadmap).toEqual(updatedRoadmap);

    // Client B did NOT get an update (still only 2 messages: snapshot + init)
    expect(clientB.messages).toHaveLength(2);
  });

  it('should stop sending updates after unsubscribe', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    client.send({ type: 'subscribe', projectId: projectAlpha.value });
    await client.waitForMessage(2);

    client.send({ type: 'unsubscribe', projectId: projectAlpha.value });
    await delay(50);

    const transitions: readonly RoadmapTransition[] = [
      { step_id: '01-01', from_status: 'pending', to_status: 'in_progress', teammate_id: null, timestamp: '2026-03-01T01:00:00Z' },
    ];
    server.notifyProjectUpdate(projectAlpha.value, makeRoadmap(), transitions);

    await delay(100);
    // Should still only have snapshot + init (no update after unsubscribe)
    expect(client.messages).toHaveLength(2);
  });

  it('should broadcast project_list to all clients on notifyProjectListChange', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    // Add beta to entries, then notify
    entries.set(projectBeta.value, makeEntry(projectBeta.value));
    server.notifyProjectListChange();

    await client.waitForMessage(2);
    const msg = client.messages[1];
    expect(msg.type).toBe('project_list');
    if (msg.type !== 'project_list') return;
    expect(msg.projects).toHaveLength(2);
  });

  it('should ignore invalid JSON messages from client', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    // Send invalid JSON
    client.ws.send('not-json');
    // Send valid JSON but wrong shape
    client.ws.send(JSON.stringify({ type: 'unknown' }));
    // Send subscribe without projectId
    client.ws.send(JSON.stringify({ type: 'subscribe' }));

    await delay(100);

    // Should only have the initial project_list
    expect(client.messages).toHaveLength(1);
  });

  it('should clean up subscriptions when client disconnects', async () => {
    const entries = new Map<ProjectId, ProjectEntry>();
    entries.set(projectAlpha.value, makeEntry(projectAlpha.value));
    const deps = makeDeps(entries);

    server = createSubscriptionServer(0, deps);
    await server.ready;

    const client = await connectTestClient(server.port);
    testClients.push(client);
    await client.waitForMessage(1);

    client.send({ type: 'subscribe', projectId: projectAlpha.value });
    await client.waitForMessage(2);

    // Disconnect client
    client.ws.close();
    await delay(100);

    // Broadcast should not throw
    const transitions: readonly RoadmapTransition[] = [
      { step_id: '01-01', from_status: 'pending', to_status: 'in_progress', teammate_id: null, timestamp: '2026-03-01T01:00:00Z' },
    ];
    expect(() => {
      server!.notifyProjectUpdate(projectAlpha.value, makeRoadmap(), transitions);
    }).not.toThrow();
  });
});

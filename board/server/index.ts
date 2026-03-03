import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer as createNodeHttpServer } from 'node:http';
import type {
  DeliveryState,
  ExecutionPlan,
  ProjectId,
  ProjectEntry,
  ProjectSummary,
  FeatureSummary,
  ClientWSMessage,
  ServerWSMessage,
  StateTransition,
  Result,
  DirEntry,
  DocTreeError,
  DocContentError,
  AddProjectError,
  RemoveProjectError,
  FeatureId,
  BrowseEntry,
  BrowseError,
} from '../shared/types.js';
import { createProjectId, createFeatureId, deriveProjectSummary } from '../shared/types.js';
import { validateDocPath } from './doc-content.js';
import { validateBrowsePath, computeParentPath } from './browse.js';
import { buildDocTree } from './doc-tree.js';
import { resolveFeatureRoadmap } from './feature-path-resolver.js';
import { isRecord, parseRoadmap, computeRoadmapSummary } from './parser.js';

// --- Client message parsing (pure function) ---

export const parseClientMessage = (data: string): ClientWSMessage | null => {
  try {
    const parsed = JSON.parse(data);
    if (!isRecord(parsed)) return null;
    if (parsed.type !== 'subscribe' && parsed.type !== 'unsubscribe') return null;
    if (typeof parsed.projectId !== 'string') return null;
    const projectIdResult = createProjectId(parsed.projectId);
    if (!projectIdResult.ok) return null;
    return { type: parsed.type, projectId: projectIdResult.value };
  } catch {
    return null;
  }
};

// --- Subscription-based WS Server (IO boundary / adapter) ---

export interface SubscriptionServerDeps {
  readonly getProject: (projectId: ProjectId) => Result<ProjectEntry, unknown>;
  readonly listProjectSummaries: () => readonly ProjectSummary[];
}

export interface SubscriptionServer {
  readonly port: number;
  readonly ready: Promise<void>;
  readonly notifyProjectUpdate: (
    projectId: ProjectId,
    state: DeliveryState,
    transitions: readonly StateTransition[],
  ) => void;
  readonly notifyProjectListChange: () => void;
  readonly notifyProjectRemoved: (projectId: ProjectId) => void;
  readonly notifyParseError: (projectId: ProjectId, error: string) => void;
  readonly close: () => Promise<void>;
}

const sendJson = (ws: WebSocket, message: ServerWSMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

export const createSubscriptionServer = (
  port: number,
  deps: SubscriptionServerDeps,
): SubscriptionServer => {
  const subscriptions = new Map<WebSocket, Set<ProjectId>>();
  const wss = new WebSocketServer({ port });

  wss.on('connection', (rawWs) => {
    const ws = rawWs as WebSocket;
    subscriptions.set(ws, new Set());

    sendJson(ws, {
      type: 'project_list',
      projects: deps.listProjectSummaries(),
    });

    ws.on('message', (data) => {
      const subs = subscriptions.get(ws);
      if (!subs) return;

      const msg = parseClientMessage(data.toString());
      if (!msg) return;

      if (msg.type === 'subscribe') {
        subs.add(msg.projectId);
        const result = deps.getProject(msg.projectId);
        if (result.ok) {
          sendJson(ws, {
            type: 'init',
            projectId: msg.projectId,
            state: result.value.state,
            plan: result.value.plan,
          });
        }
      } else if (msg.type === 'unsubscribe') {
        subs.delete(msg.projectId);
      }
    });

    ws.on('close', () => {
      subscriptions.delete(ws);
    });
  });

  const ready = new Promise<void>((resolve) => {
    wss.on('listening', resolve);
  });

  const resolvedPort = (): number => {
    const addr = wss.address();
    if (typeof addr === 'string' || addr === null) return port;
    return addr.port;
  };

  const notifyProjectUpdate = (
    projectId: ProjectId,
    state: DeliveryState,
    transitions: readonly StateTransition[],
  ): void => {
    if (transitions.length === 0) return;

    const msg: ServerWSMessage = {
      type: 'update',
      projectId,
      state,
      transitions,
    };
    for (const [ws, subs] of subscriptions) {
      if (subs.has(projectId)) {
        sendJson(ws, msg);
      }
    }
  };

  const notifyProjectListChange = (): void => {
    const msg: ServerWSMessage = {
      type: 'project_list',
      projects: deps.listProjectSummaries(),
    };
    for (const ws of subscriptions.keys()) {
      sendJson(ws, msg);
    }
  };

  const notifyProjectRemoved = (projectId: ProjectId): void => {
    const msg: ServerWSMessage = { type: 'project_removed', projectId };
    for (const [ws, subs] of subscriptions) {
      if (subs.has(projectId)) {
        sendJson(ws, msg);
        subs.delete(projectId);
      }
    }
  };

  const notifyParseError = (projectId: ProjectId, error: string): void => {
    const msg: ServerWSMessage = { type: 'parse_error', projectId, error };
    for (const [ws, subs] of subscriptions) {
      if (subs.has(projectId)) {
        sendJson(ws, msg);
      }
    }
  };

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      for (const client of wss.clients) {
        client.close();
      }
      subscriptions.clear();
      wss.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  return {
    get port() { return resolvedPort(); },
    ready,
    notifyProjectUpdate,
    notifyProjectListChange,
    notifyProjectRemoved,
    notifyParseError,
    close,
  };
};

// --- Multi-project HTTP routes (IO boundary / adapter) ---

export interface DocHttpDeps {
  readonly getDocsRoot: (projectId: ProjectId) => string | undefined;
  readonly getFeatureDocsRoot?: (projectId: ProjectId, featureId: FeatureId) => string | undefined;
  readonly scanDocsDir: (docsRoot: string) => Promise<Result<readonly DirEntry[], DocTreeError>>;
  readonly readDocContent: (validatedPath: string) => Promise<Result<string, DocContentError>>;
}

export interface FeatureArtifactDeps {
  readonly getProjectPath: (projectId: ProjectId) => string | undefined;
  readonly readFile: (path: string) => Promise<Result<string, string>>;
}

export interface BrowseHttpDeps {
  readonly listDirectories: (validatedPath: string) => Promise<Result<BrowseEntry[], BrowseError>>;
  readonly defaultPath: () => string;
}

export interface MultiProjectHttpDeps {
  readonly listProjectSummaries: () => readonly ProjectSummary[];
  readonly getProject: (projectId: ProjectId) => Result<ProjectEntry, unknown>;
  readonly docs?: DocHttpDeps;
  readonly browse?: BrowseHttpDeps;
  readonly addProject?: (path: string) => Promise<Result<ProjectSummary, AddProjectError>>;
  readonly removeProject?: (projectId: ProjectId) => Promise<Result<void, RemoveProjectError>>;
  readonly discoverFeatures?: (projectId: ProjectId) => Promise<readonly FeatureSummary[]>;
  readonly featureArtifacts?: FeatureArtifactDeps;
}

export const createMultiProjectHttpApp = (deps: MultiProjectHttpDeps): express.Application => {
  const app = express();
  app.use(express.json());

  app.get('/api/projects', (_req, res) => {
    res.json(deps.listProjectSummaries());
  });

  if (deps.addProject) {
    const addProject = deps.addProject;
    app.post('/api/projects', async (req, res) => {
      const { path } = req.body ?? {};
      if (typeof path !== 'string' || !path.trim()) {
        res.status(400).json({ error: 'Missing required field: path' });
        return;
      }

      const result = await addProject(path.trim());
      if (!result.ok) {
        switch (result.error.type) {
          case 'invalid_path':
            res.status(400).json({ error: result.error.message });
            return;
          case 'duplicate':
            res.status(409).json({ error: `Project '${result.error.projectId}' already exists` });
            return;
          case 'registration_failed':
            res.status(500).json({ error: result.error.message });
            return;
        }
      }

      res.status(201).json(result.value);
    });
  }

  if (deps.removeProject) {
    const removeProject = deps.removeProject;
    app.delete('/api/projects/:id', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const result = await removeProject(idResult.value);
      if (!result.ok) {
        switch (result.error.type) {
          case 'not_found':
            res.status(404).json({ error: `Project '${result.error.projectId}' not found` });
            return;
          case 'removal_failed':
            res.status(500).json({ error: result.error.message });
            return;
        }
      }

      res.sendStatus(204);
    });
  }

  app.get('/api/projects/:id/state', (req, res) => {
    const idResult = createProjectId(req.params.id);
    if (!idResult.ok) {
      res.status(400).json({ error: idResult.error });
      return;
    }
    const result = deps.getProject(idResult.value);
    if (!result.ok) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(result.value.state);
  });

  app.get('/api/projects/:id/plan', (req, res) => {
    const idResult = createProjectId(req.params.id);
    if (!idResult.ok) {
      res.status(400).json({ error: idResult.error });
      return;
    }
    const result = deps.getProject(idResult.value);
    if (!result.ok) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(result.value.plan);
  });

  // --- Feature discovery endpoint ---

  if (deps.discoverFeatures) {
    const discoverFeatures = deps.discoverFeatures;

    app.get('/api/projects/:id/features', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const features = await discoverFeatures(idResult.value);
      res.json(features);
    });
  }

  // --- Feature artifact endpoints (state + plan per feature) ---

  if (deps.featureArtifacts) {
    const { getProjectPath, readFile } = deps.featureArtifacts;

    app.get('/api/projects/:id/features/:featureId/roadmap', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const featureIdResult = createFeatureId(req.params.featureId);
      if (!featureIdResult.ok) {
        res.status(400).json({ error: featureIdResult.error });
        return;
      }

      const projectPath = getProjectPath(idResult.value);
      if (!projectPath) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const filePath = resolveFeatureRoadmap(projectPath, featureIdResult.value);
      const fileResult = await readFile(filePath);
      if (!fileResult.ok) {
        res.status(404).json({ error: 'Feature roadmap not found' });
        return;
      }

      const roadmapResult = parseRoadmap(fileResult.value);
      if (!roadmapResult.ok) {
        res.status(422).json({
          error: 'Malformed roadmap',
          diagnostic: { type: roadmapResult.error.type, message: roadmapResult.error.message },
        });
        return;
      }

      const summary = computeRoadmapSummary(roadmapResult.value);
      res.json({
        roadmap: roadmapResult.value.roadmap,
        phases: roadmapResult.value.phases,
        summary,
      });
    });
  }

  // --- Directory browser endpoint (registered when browse deps are provided) ---

  if (deps.browse) {
    const { browse } = deps;

    app.get('/api/browse', async (req, res) => {
      const rawPath = typeof req.query.path === 'string' && req.query.path
        ? req.query.path
        : browse.defaultPath();

      const pathResult = validateBrowsePath(rawPath);
      if (!pathResult.ok) {
        res.status(400).json({ error: pathResult.error.message });
        return;
      }

      const validatedPath = pathResult.value;
      const listResult = await browse.listDirectories(validatedPath);
      if (!listResult.ok) {
        switch (listResult.error.type) {
          case 'invalid_path':
            res.status(400).json({ error: listResult.error.message });
            return;
          case 'permission_denied':
            res.status(403).json({ error: `Permission denied: ${listResult.error.path}` });
            return;
          case 'not_found':
            res.status(404).json({ error: `Directory not found: ${listResult.error.path}` });
            return;
          case 'read_failed':
            res.status(500).json({ error: listResult.error.message });
            return;
        }
      }

      res.json({ path: validatedPath, parent: computeParentPath(validatedPath), entries: listResult.value });
    });
  }

  // --- Doc-viewer endpoints (registered when docs deps are provided) ---

  if (deps.docs) {
    const { docs } = deps;

    app.get('/api/projects/:id/docs/tree', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const docsRoot = docs.getDocsRoot(idResult.value);
      if (!docsRoot) {
        res.status(404).json({ error: 'Documentation not configured for this project' });
        return;
      }

      const scanResult = await docs.scanDocsDir(docsRoot);
      if (!scanResult.ok) {
        const status = scanResult.error.type === 'not_found' ? 404 : 500;
        res.status(status).json({ error: scanResult.error.type === 'not_found'
          ? 'Documentation directory not found'
          : 'Failed to scan documentation directory' });
        return;
      }

      res.json(buildDocTree(scanResult.value));
    });

    app.get('/api/projects/:id/docs/content', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const pathParam = req.query.path;
      if (typeof pathParam !== 'string' || !pathParam) {
        res.status(400).json({ error: 'Missing required query parameter: path' });
        return;
      }

      const docsRoot = docs.getDocsRoot(idResult.value);
      if (!docsRoot) {
        res.status(404).json({ error: 'Documentation not configured for this project' });
        return;
      }

      const pathResult = validateDocPath(docsRoot, pathParam);
      if (!pathResult.ok) {
        res.status(400).json({ error: pathResult.error.message });
        return;
      }

      const contentResult = await docs.readDocContent(pathResult.value);
      if (!contentResult.ok) {
        const status = contentResult.error.type === 'not_found' ? 404 : 500;
        res.status(status).json({ error: contentResult.error.type === 'not_found'
          ? 'Document not found'
          : 'Failed to read document' });
        return;
      }

      res.type('text/markdown; charset=utf-8').send(contentResult.value);
    });

    // --- Feature-scoped doc endpoints ---

    if (docs.getFeatureDocsRoot) {
      const getFeatureDocsRoot = docs.getFeatureDocsRoot;

      app.get('/api/projects/:id/features/:featureId/docs/tree', async (req, res) => {
        const idResult = createProjectId(req.params.id);
        if (!idResult.ok) {
          res.status(400).json({ error: idResult.error });
          return;
        }

        const featureIdResult = createFeatureId(req.params.featureId);
        if (!featureIdResult.ok) {
          res.status(400).json({ error: featureIdResult.error });
          return;
        }

        const featureDocsRoot = getFeatureDocsRoot(idResult.value, featureIdResult.value);
        if (!featureDocsRoot) {
          res.status(404).json({ error: 'Documentation not found for this feature' });
          return;
        }

        const scanResult = await docs.scanDocsDir(featureDocsRoot);
        if (!scanResult.ok) {
          const status = scanResult.error.type === 'not_found' ? 404 : 500;
          res.status(status).json({ error: scanResult.error.type === 'not_found'
            ? 'Feature documentation directory not found'
            : 'Failed to scan feature documentation directory' });
          return;
        }

        res.json(buildDocTree(scanResult.value));
      });

      app.get('/api/projects/:id/features/:featureId/docs/content', async (req, res) => {
        const idResult = createProjectId(req.params.id);
        if (!idResult.ok) {
          res.status(400).json({ error: idResult.error });
          return;
        }

        const featureIdResult = createFeatureId(req.params.featureId);
        if (!featureIdResult.ok) {
          res.status(400).json({ error: featureIdResult.error });
          return;
        }

        const pathParam = req.query.path;
        if (typeof pathParam !== 'string' || !pathParam) {
          res.status(400).json({ error: 'Missing required query parameter: path' });
          return;
        }

        const featureDocsRoot = getFeatureDocsRoot(idResult.value, featureIdResult.value);
        if (!featureDocsRoot) {
          res.status(404).json({ error: 'Documentation not found for this feature' });
          return;
        }

        const pathResult = validateDocPath(featureDocsRoot, pathParam);
        if (!pathResult.ok) {
          res.status(400).json({ error: pathResult.error.message });
          return;
        }

        const contentResult = await docs.readDocContent(pathResult.value);
        if (!contentResult.ok) {
          const status = contentResult.error.type === 'not_found' ? 404 : 500;
          res.status(status).json({ error: contentResult.error.type === 'not_found'
            ? 'Document not found'
            : 'Failed to read document' });
          return;
        }

        res.type('text/markdown; charset=utf-8').send(contentResult.value);
      });
    }
  }

  return app;
};

// --- HTTP Server (IO boundary / adapter) ---

export interface HttpServer {
  readonly port: number;
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

export const createHttpServer = (
  app: express.Application,
  port: number,
): HttpServer => {
  const server = createNodeHttpServer(app);

  const ready = new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  const resolvedPort = (): number => {
    const addr = server.address();
    if (typeof addr === 'string' || addr === null) return port;
    return addr.port;
  };

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  return {
    get port() { return resolvedPort(); },
    ready,
    close,
  };
};

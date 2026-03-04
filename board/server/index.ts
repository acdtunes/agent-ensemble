import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer as createNodeHttpServer } from 'node:http';
import type {
  Roadmap,
  RoadmapTransition,
  ProjectId,
  ProjectEntry,
  ProjectSummary,
  FeatureSummary,
  ClientWSMessage,
  ServerWSMessage,
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
import { createProjectId, createFeatureId, computeRoadmapSummary } from '../shared/types.js';
import { validateDocPath } from './doc-content.js';
import { validateBrowsePath, computeParentPath } from './browse.js';
import { buildDocTree } from './doc-tree.js';
import { resolveFeatureRoadmap } from './feature-path-resolver.js';
import { isRecord, parseRoadmap } from './parser.js';

// --- Client message parsing (pure function) ---

export const parseClientMessage = (data: string): ClientWSMessage | null => {
  try {
    const parsed = JSON.parse(data);
    if (!isRecord(parsed)) return null;
    if (parsed.type !== 'subscribe' && parsed.type !== 'unsubscribe') return null;
    if (typeof parsed.projectId !== 'string') return null;
    const projectIdResult = createProjectId(parsed.projectId);
    if (!projectIdResult.ok) return null;

    if ('featureId' in parsed && parsed.featureId !== undefined) {
      if (typeof parsed.featureId !== 'string') return null;
      const featureIdResult = createFeatureId(parsed.featureId);
      if (!featureIdResult.ok) return null;
      return { type: parsed.type, projectId: projectIdResult.value, featureId: featureIdResult.value };
    }

    return { type: parsed.type, projectId: projectIdResult.value };
  } catch {
    return null;
  }
};

// --- Subscription-based WS Server (IO boundary / adapter) ---

export interface SubscriptionServerDeps {
  readonly getProject: (projectId: ProjectId) => Result<ProjectEntry, unknown>;
  readonly listProjectSummaries: () => readonly ProjectSummary[];
  readonly getFeatureRoadmap?: (projectId: ProjectId, featureId: FeatureId) => Roadmap | null;
  readonly onFeatureSubscribed?: (projectId: ProjectId, featureId: FeatureId) => void;
  readonly onFeatureUnsubscribed?: (projectId: ProjectId, featureId: FeatureId) => void;
}

export interface SubscriptionServer {
  readonly port: number;
  readonly ready: Promise<void>;
  readonly notifyProjectUpdate: (
    projectId: ProjectId,
    roadmap: Roadmap,
    roadmapTransitions: readonly RoadmapTransition[],
  ) => void;
  readonly notifyFeatureUpdate: (
    projectId: ProjectId,
    featureId: FeatureId,
    roadmap: Roadmap,
    roadmapTransitions: readonly RoadmapTransition[],
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

const featureKey = (projectId: ProjectId, featureId: FeatureId): string =>
  `${projectId}:${featureId}`;

export const createSubscriptionServer = (
  port: number,
  deps: SubscriptionServerDeps,
): SubscriptionServer => {
  const subscriptions = new Map<WebSocket, Set<ProjectId>>();
  const featureSubscriptions = new Map<WebSocket, Map<ProjectId, Set<FeatureId>>>();
  const featureSubscriberCounts = new Map<string, number>();

  const decrementFeatureSubscriberCount = (projectId: ProjectId, featureId: FeatureId): void => {
    const key = featureKey(projectId, featureId);
    const count = (featureSubscriberCounts.get(key) ?? 1) - 1;
    if (count <= 0) {
      featureSubscriberCounts.delete(key);
      deps.onFeatureUnsubscribed?.(projectId, featureId);
    } else {
      featureSubscriberCounts.set(key, count);
    }
  };

  const webSocketServer = new WebSocketServer({ port });

  webSocketServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`WebSocket port ${port} already in use. Kill the existing process: lsof -ti :${port} | xargs kill`);
    } else {
      console.error('WebSocket server error:', error.message);
    }
    process.exit(1);
  });

  webSocketServer.on('connection', (rawWs) => {
    const ws = rawWs as WebSocket;
    subscriptions.set(ws, new Set());
    featureSubscriptions.set(ws, new Map());

    sendJson(ws, {
      type: 'project_list',
      projects: deps.listProjectSummaries(),
    });

    ws.on('message', (rawData) => {
      const projectSubs = subscriptions.get(ws);
      if (!projectSubs) return;

      const clientMessage = parseClientMessage(rawData.toString());
      if (!clientMessage) return;

      if (clientMessage.type === 'subscribe') {
        if (clientMessage.featureId) {
          const clientFeatureSubs = featureSubscriptions.get(ws)!;
          const projectFeatures = clientFeatureSubs.get(clientMessage.projectId) ?? new Set<FeatureId>();
          if (!projectFeatures.has(clientMessage.featureId)) {
            projectFeatures.add(clientMessage.featureId);
            clientFeatureSubs.set(clientMessage.projectId, projectFeatures);

            const key = featureKey(clientMessage.projectId, clientMessage.featureId);
            const countBefore = featureSubscriberCounts.get(key) ?? 0;
            featureSubscriberCounts.set(key, countBefore + 1);

            if (countBefore === 0) {
              deps.onFeatureSubscribed?.(clientMessage.projectId, clientMessage.featureId);
            }
          }

          const roadmap = deps.getFeatureRoadmap?.(clientMessage.projectId, clientMessage.featureId);
          if (roadmap) {
            sendJson(ws, { type: 'init', projectId: clientMessage.projectId, featureId: clientMessage.featureId, roadmap });
          }
        } else {
          projectSubs.add(clientMessage.projectId);
          const result = deps.getProject(clientMessage.projectId);
          if (result.ok) {
            sendJson(ws, {
              type: 'init',
              projectId: clientMessage.projectId,
              roadmap: result.value.roadmap,
            });
          }
        }
      } else if (clientMessage.type === 'unsubscribe') {
        if (clientMessage.featureId) {
          const clientFeatureSubs = featureSubscriptions.get(ws);
          const projectFeatures = clientFeatureSubs?.get(clientMessage.projectId);
          if (projectFeatures?.has(clientMessage.featureId)) {
            projectFeatures.delete(clientMessage.featureId);
            decrementFeatureSubscriberCount(clientMessage.projectId, clientMessage.featureId);
          }
        } else {
          projectSubs.delete(clientMessage.projectId);
        }
      }
    });

    ws.on('close', () => {
      const clientFeatureSubs = featureSubscriptions.get(ws);
      if (clientFeatureSubs) {
        for (const [projectId, featureIds] of clientFeatureSubs) {
          for (const featureId of featureIds) {
            decrementFeatureSubscriberCount(projectId, featureId);
          }
        }
      }

      subscriptions.delete(ws);
      featureSubscriptions.delete(ws);
    });
  });

  const ready = new Promise<void>((resolve) => {
    webSocketServer.on('listening', resolve);
  });

  const resolvedPort = (): number => {
    const addr = webSocketServer.address();
    if (typeof addr === 'string' || addr === null) return port;
    return addr.port;
  };

  const notifyProjectUpdate = (
    projectId: ProjectId,
    roadmap: Roadmap,
    roadmapTransitions: readonly RoadmapTransition[],
  ): void => {
    if (roadmapTransitions.length === 0) return;

    const msg: ServerWSMessage = {
      type: 'update',
      projectId,
      roadmap,
      roadmapTransitions,
    };
    for (const [ws, subs] of subscriptions) {
      if (subs.has(projectId)) {
        sendJson(ws, msg);
      }
    }
  };

  const notifyFeatureUpdate = (
    projectId: ProjectId,
    featureId: FeatureId,
    roadmap: Roadmap,
    roadmapTransitions: readonly RoadmapTransition[],
  ): void => {
    if (roadmapTransitions.length === 0) return;

    const msg: ServerWSMessage = {
      type: 'update',
      projectId,
      featureId,
      roadmap,
      roadmapTransitions,
    };
    for (const [ws, featureSubs] of featureSubscriptions) {
      const projectFeatures = featureSubs.get(projectId);
      if (projectFeatures?.has(featureId)) {
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
      for (const client of webSocketServer.clients) {
        client.close();
      }
      subscriptions.clear();
      featureSubscriptions.clear();
      featureSubscriberCounts.clear();
      webSocketServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  return {
    get port() { return resolvedPort(); },
    ready,
    notifyProjectUpdate,
    notifyFeatureUpdate,
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

// --- Shared doc response helpers (reduce duplication across project/feature endpoints) ---

const sendDocTree = async (
  docs: DocHttpDeps,
  docsRoot: string,
  res: express.Response,
  label: string,
): Promise<void> => {
  const scanResult = await docs.scanDocsDir(docsRoot);
  if (!scanResult.ok) {
    const status = scanResult.error.type === 'not_found' ? 404 : 500;
    res.status(status).json({ error: scanResult.error.type === 'not_found'
      ? `${label} directory not found`
      : `Failed to scan ${label.toLowerCase()} directory` });
    return;
  }
  res.json(buildDocTree(scanResult.value));
};

const getDocContentErrorMessage = (error: DocContentError): string => {
  switch (error.type) {
    case 'not_found': return 'Document not found';
    case 'invalid_path': return error.message;
    case 'read_failed': return error.message;
  }
};

const getBrowseErrorMessage = (error: BrowseError): string => {
  switch (error.type) {
    case 'not_found': return `Directory not found: ${error.path}`;
    case 'invalid_path': return error.message;
    case 'permission_denied': return `Permission denied: ${error.path}`;
    case 'read_failed': return error.message;
  }
};

const sendDocContent = async (
  docs: DocHttpDeps,
  docsRoot: string,
  pathParam: string,
  res: express.Response,
): Promise<void> => {
  const pathResult = validateDocPath(docsRoot, pathParam);
  if (!pathResult.ok) {
    res.status(400).json({ error: getDocContentErrorMessage(pathResult.error) });
    return;
  }

  const contentResult = await docs.readDocContent(pathResult.value);
  if (!contentResult.ok) {
    const status = contentResult.error.type === 'not_found' ? 404 : 500;
    res.status(status).json({ error: getDocContentErrorMessage(contentResult.error) });
    return;
  }

  res.type('text/markdown; charset=utf-8').send(contentResult.value);
};

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

  // --- Feature discovery endpoint ---

  if (deps.discoverFeatures) {
    const discoverFeatures = deps.discoverFeatures;

    app.get('/api/projects/:id/features', async (req, res) => {
      const idResult = createProjectId(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: idResult.error });
        return;
      }

      const projectResult = deps.getProject(idResult.value);
      if (!projectResult.ok) {
        res.status(404).json({ error: `Project not found: ${idResult.value}` });
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
        res.status(400).json({ error: getBrowseErrorMessage(pathResult.error) });
        return;
      }

      const validatedPath = pathResult.value;
      const listResult = await browse.listDirectories(validatedPath);
      if (!listResult.ok) {
        const status = listResult.error.type === 'not_found' ? 404
          : listResult.error.type === 'permission_denied' ? 403
          : listResult.error.type === 'invalid_path' ? 400
          : 500;
        res.status(status).json({ error: getBrowseErrorMessage(listResult.error) });
        return;
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

      await sendDocTree(docs, docsRoot, res, 'Documentation');
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

      await sendDocContent(docs, docsRoot, pathParam, res);
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

        await sendDocTree(docs, featureDocsRoot, res, 'Feature documentation');
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

        await sendDocContent(docs, featureDocsRoot, pathParam, res);
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

  const ready = new Promise<void>((resolve, reject) => {
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`HTTP port ${port} already in use. Kill the existing process: lsof -ti :${port} | xargs kill`);
      } else {
        console.error('HTTP server error:', error.message);
      }
      reject(error);
    });
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

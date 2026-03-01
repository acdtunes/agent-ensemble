import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer as createNodeHttpServer } from 'node:http';
import type { DeliveryState, ExecutionPlan, WSMessage } from '../shared/types.js';
import { computeTransitions } from './differ.js';

// --- Broadcast Server (IO boundary / adapter) ---

export interface BroadcastServer {
  readonly port: number;
  readonly ready: Promise<void>;
  readonly updateState: (newState: DeliveryState) => void;
  readonly close: () => Promise<void>;
}

export interface BroadcastServerOptions {
  readonly port: number;
  readonly state: DeliveryState;
  readonly plan: ExecutionPlan;
}

export const createBroadcastServer = (options: BroadcastServerOptions): BroadcastServer => {
  let currentState = options.state;
  const plan = options.plan;

  const wss = new WebSocketServer({ port: options.port });

  const sendToClient = (ws: WebSocket, message: WSMessage): void => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const broadcastToAll = (message: WSMessage): void => {
    for (const client of wss.clients) {
      sendToClient(client as WebSocket, message);
    }
  };

  // Send init message to each new client
  wss.on('connection', (ws) => {
    const initMessage: WSMessage = { type: 'init', state: currentState, plan };
    sendToClient(ws as WebSocket, initMessage);
  });

  const ready = new Promise<void>((resolve) => {
    wss.on('listening', resolve);
  });

  const updateState = (newState: DeliveryState): void => {
    const transitions = computeTransitions(currentState, newState, new Date().toISOString());

    currentState = newState;

    if (transitions.length === 0) return;

    const updateMessage: WSMessage = { type: 'update', state: newState, transitions };
    broadcastToAll(updateMessage);
  };

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      // Close all client connections first
      for (const client of wss.clients) {
        client.close();
      }
      wss.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  const resolvedPort = (): number => {
    const addr = wss.address();
    if (typeof addr === 'string' || addr === null) return options.port;
    return addr.port;
  };

  return {
    get port() { return resolvedPort(); },
    ready,
    updateState,
    close,
  };
};

// --- HTTP Server (IO boundary / adapter) ---

export interface HttpAppDeps {
  readonly getState: () => DeliveryState | null;
  readonly getPlan: () => ExecutionPlan | null;
}

export interface HttpServer {
  readonly port: number;
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

export const createHttpApp = (deps: HttpAppDeps): express.Application => {
  const app = express();

  app.get('/api/state', (_req, res) => {
    const state = deps.getState();
    if (state === null) {
      res.status(503).json({ error: 'State not available: state.yaml does not exist or has not been loaded' });
      return;
    }
    res.json(state);
  });

  app.get('/api/plan', (_req, res) => {
    const plan = deps.getPlan();
    if (plan === null) {
      res.status(503).json({ error: 'Plan not available: plan.yaml does not exist or has not been loaded' });
      return;
    }
    res.json(plan);
  });

  return app;
};

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

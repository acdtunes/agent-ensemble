import { resolve } from 'node:path';
import { createMultiProjectServer } from './multi-project-server.js';

const PROJECTS_ROOT = resolve(process.env.PROJECTS_ROOT ?? '.');
const WS_PORT = Number(process.env.WS_PORT ?? 3002);
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 3001);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2000);

const server = createMultiProjectServer({
  projectsRoot: PROJECTS_ROOT,
  wsPort: WS_PORT,
  httpPort: HTTP_PORT,
  pollIntervalMs: POLL_INTERVAL_MS,
});

server.ready.then(() => {
  console.log(`Board server running:`);
  console.log(`  HTTP:     http://localhost:${server.httpPort}`);
  console.log(`  WS:       ws://localhost:${server.wsPort}`);
  console.log(`  Projects: ${PROJECTS_ROOT}`);
});

const gracefulShutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

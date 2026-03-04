# Technology Stack: Kanban Board

## Runtime

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | TypeScript | 5.x | Shared types between server and client |
| Runtime | Node.js | 20+ LTS | Server-side file watching and WebSocket |
| Package manager | npm | 10+ | Dependency management |

## Frontend

| Technology | Purpose | Alternative Considered |
|-----------|---------|----------------------|
| React 19 | UI framework | Svelte (smaller, but team preference is React) |
| Vite | Build tool / dev server | Next.js (SSR not needed for localhost dashboard) |
| Tailwind CSS 4 | Styling | CSS Modules (slower to iterate on visual polish) |
| Native WebSocket | Real-time connection | socket.io (overkill for single-client localhost) |

## Backend

| Technology | Purpose | Alternative Considered |
|-----------|---------|----------------------|
| Express | HTTP server (initial state, health check) | Fastify (marginal benefit for this scope) |
| ws | WebSocket server | socket.io (unnecessary abstraction layer) |
| chokidar | File system watcher | Node fs.watch (unreliable on macOS) |
| js-yaml | YAML parsing | yaml (heavier, more features than needed) |

## Dev Tools

| Technology | Purpose |
|-----------|---------|
| concurrently | Run Vite + server in one terminal |
| tsx | Run TypeScript server without compile step |
| ESLint | Linting |
| Prettier | Formatting |

## No Dependencies On

- Database (state lives in YAML files)
- Authentication (localhost only)
- Docker (runs directly with Node.js)
- CI/CD (dev tool, not deployed)

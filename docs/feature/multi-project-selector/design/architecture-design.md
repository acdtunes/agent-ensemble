# Multi-Project Selector -- Architecture Design

## System Context

The board app is a local development monitoring tool for a solo developer. It watches project artifacts on the filesystem and presents delivery state through a browser UI. The multi-project-selector feature extends the existing single-project-root model to support arbitrary filesystem paths and per-feature navigation.

### Capabilities

- Register/unregister projects from arbitrary filesystem paths via UI
- Discover features within each project by scanning `docs/feature/` directories
- Navigate hierarchy: Projects > Features > Board/Docs
- Switch project/feature via dropdowns without navigating back
- Persist project manifest across server restarts

### C4 System Context (L1)

```mermaid
C4Context
    title System Context -- nw-teams Board App

    Person(developer, "Solo Developer", "Monitors delivery progress across multiple projects")

    System(boardApp, "Board App", "Local web app that watches project artifacts and displays delivery boards, feature status, and documentation")

    System_Ext(filesystem, "Local Filesystem", "Project directories containing state.yaml, plan.yaml, roadmap.yaml, execution-log.yaml, and docs/")
    System_Ext(cliTools, "nw-teams CLI", "Python CLI tools that write state.yaml and plan.yaml during delivery execution")

    Rel(developer, boardApp, "Registers projects, browses features, views boards and docs", "HTTP/WS via browser")
    Rel(boardApp, filesystem, "Watches and reads project artifacts", "fs/chokidar")
    Rel(cliTools, filesystem, "Writes delivery state files", "YAML files")
```

### C4 Container (L2)

```mermaid
C4Container
    title Container Diagram -- Board App

    Person(developer, "Solo Developer")

    Container_Boundary(boardApp, "Board App") {
        Container(spa, "React SPA", "React + Vite + TypeScript", "Overview dashboard, feature views, kanban boards, doc viewer with project/feature selectors")
        Container(httpServer, "HTTP Server", "Express + TypeScript", "REST API for projects, features, delivery state, plans, and docs. Project add/remove endpoints.")
        Container(wsServer, "WebSocket Server", "ws + TypeScript", "Real-time project list updates and delivery state subscriptions")
        ContainerDb(manifest, "Project Manifest", "JSON file (~/.nwave/projects.json)", "Persisted list of registered project paths")
    }

    System_Ext(filesystem, "Local Filesystem")

    Rel(developer, spa, "Browses projects, features, boards, docs", "HTTPS")
    Rel(spa, httpServer, "Fetches projects, features, state, plan, docs", "HTTP REST")
    Rel(spa, wsServer, "Subscribes to project list and delivery state updates", "WebSocket")
    Rel(httpServer, filesystem, "Reads project artifacts, scans feature directories", "Node fs")
    Rel(httpServer, manifest, "Reads/writes registered project list", "Node fs")
    Rel(wsServer, filesystem, "Watches state.yaml and execution-log.yaml for changes", "chokidar")
```

### C4 Component -- Server (L3)

```mermaid
C4Component
    title Component Diagram -- Server

    Component(httpRoutes, "HTTP Routes", "Express routes", "REST endpoints for projects, features, state, plan, docs. POST/DELETE for project registration.")
    Component(wsSubscription, "Subscription Server", "ws", "WebSocket connections, per-client project subscriptions, broadcast on state change")
    Component(registry, "Project Registry", "TypeScript module", "In-memory project store. Add/remove/get/getAll. File watchers per project.")
    Component(manifestStore, "Manifest Store", "TypeScript module", "Reads/writes ~/.nwave/projects.json. Pure load/save with IO adapter.")
    Component(featureDiscovery, "Feature Discovery", "TypeScript module", "Scans docs/feature/ for subdirs. Reads roadmap.yaml and execution-log.yaml per feature. Pure scan + IO adapter.")
    Component(pathResolver, "Path Resolver", "TypeScript module", "Pure functions: projectPath + featureId -> artifact paths (roadmap, execution-log, docs root)")
    Component(parser, "Parser", "TypeScript module", "parseStateYaml, parsePlanYaml -- reused for feature-level artifacts")
    Component(docTree, "Doc Tree", "TypeScript module", "buildDocTree (pure), scanDocsDir (IO adapter)")
    Component(docContent, "Doc Content", "TypeScript module", "validateDocPath (pure), readDocContent (IO adapter)")
    Component(watcher, "File Watcher", "TypeScript module", "chokidar wrapper with debounce")
    Component(discovery, "Project Discovery", "TypeScript module", "Optional PROJECTS_ROOT polling (legacy/secondary)")
    Component(compositionRoot, "Composition Root", "TypeScript module", "Wires all components, creates server instance")

    Rel(httpRoutes, registry, "Queries project entries")
    Rel(httpRoutes, featureDiscovery, "Requests feature lists")
    Rel(httpRoutes, pathResolver, "Resolves feature artifact paths")
    Rel(httpRoutes, parser, "Parses feature-level YAML")
    Rel(httpRoutes, docTree, "Scans feature-scoped docs")
    Rel(httpRoutes, docContent, "Reads feature-scoped docs")
    Rel(httpRoutes, manifestStore, "Persists project add/remove")
    Rel(wsSubscription, registry, "Queries project entries for init")
    Rel(registry, watcher, "Creates watchers per project")
    Rel(registry, parser, "Parses state/plan YAML")
    Rel(compositionRoot, httpRoutes, "Creates and configures")
    Rel(compositionRoot, wsSubscription, "Creates and configures")
    Rel(compositionRoot, registry, "Creates and configures")
    Rel(compositionRoot, manifestStore, "Loads manifest on startup")
    Rel(compositionRoot, discovery, "Optionally starts polling")
```

### C4 Component -- Client (L3)

```mermaid
C4Component
    title Component Diagram -- React SPA

    Component(app, "App", "React", "Top-level routing: dispatches to view based on Route")
    Component(router, "useRouter", "React hook", "Hash-based router. Parses extended Route union with project/feature views.")
    Component(overviewDashboard, "OverviewDashboard", "React", "Project grid with Add/Remove. Uses ProjectCard.")
    Component(projectCard, "ProjectCard", "React", "Extended with featureCount and feature status summary")
    Component(projectFeatureView, "ProjectFeatureView", "React", "Feature card grid for a project. Breadcrumb. Uses FeatureCard.")
    Component(featureCard, "FeatureCard", "React", "Feature name, progress bar, Board/Docs links")
    Component(featureBoardView, "FeatureBoardView", "React", "Board with project/feature dropdowns, breadcrumb, Board/Docs tabs. Reuses KanbanBoard.")
    Component(featureDocsView, "FeatureDocsView", "React", "DocViewer scoped to feature path. Project/feature dropdowns, breadcrumb, Board/Docs tabs.")
    Component(contextDropdowns, "ContextDropdowns", "React", "Project and Feature dropdown selectors, shared between board and docs views")
    Component(useProjectList, "useProjectList", "React hook", "WebSocket: receives project list with feature summaries")
    Component(useFeatureList, "useFeatureList", "React hook", "HTTP: fetches feature list for a project")
    Component(useFeatureState, "useFeatureState", "React hook", "HTTP: fetches feature-level delivery state and plan")
    Component(kanbanBoard, "KanbanBoard", "React", "Existing board components -- unchanged")
    Component(docViewer, "DocViewer", "React", "Existing doc viewer -- unchanged")

    Rel(app, router, "Reads current route")
    Rel(app, overviewDashboard, "Renders on 'overview' route")
    Rel(app, projectFeatureView, "Renders on 'project' route")
    Rel(app, featureBoardView, "Renders on 'feature-board' route")
    Rel(app, featureDocsView, "Renders on 'feature-docs' route")
    Rel(overviewDashboard, projectCard, "Renders per project")
    Rel(overviewDashboard, useProjectList, "Gets project list via WS")
    Rel(projectFeatureView, featureCard, "Renders per feature")
    Rel(projectFeatureView, useFeatureList, "Fetches features via HTTP")
    Rel(featureBoardView, contextDropdowns, "Renders project/feature selectors")
    Rel(featureBoardView, kanbanBoard, "Renders board with feature-level state")
    Rel(featureBoardView, useFeatureState, "Fetches feature state/plan via HTTP")
    Rel(featureDocsView, contextDropdowns, "Renders project/feature selectors")
    Rel(featureDocsView, docViewer, "Renders docs scoped to feature")
```

## Component Architecture

### Server -- New Modules

| Module | Type | Responsibility |
|--------|------|----------------|
| `manifest-store.ts` | Pure + IO adapter | Load/save `~/.nwave/projects.json`. Pure: validate manifest schema, transform entries. IO: read/write JSON file. |
| `feature-discovery.ts` | Pure + IO adapter | Scan `docs/feature/` subdirectories. Pure: filter, summarize features. IO: readdir, read YAML files. |
| `feature-path-resolver.ts` | Pure | Map `(projectPath, featureId)` to artifact paths: roadmap.yaml, execution-log.yaml, docs root. |

### Server -- Modified Modules

| Module | Changes |
|--------|---------|
| `index.ts` | Add POST/DELETE `/api/projects`, GET `/api/projects/:id/features`, GET `/api/projects/:id/features/:featureId/state\|plan\|docs/tree\|docs/content`. Add express.json() middleware. |
| `multi-project-server.ts` | Wire manifest store (load on startup, save on add/remove). Wire feature discovery deps. Extend `toConfig` to use manifest paths. Support optional PROJECTS_ROOT coexistence. |
| `shared/types.ts` | Add `FeatureSummary`, `FeatureId` branded type, `ManifestEntry`, `ProjectManifest`. Extend `ProjectSummary` with `featureCount` and `features`. Extend `ProjectConfig` with `projectPath`. |

### Client -- New Components

| Component | Responsibility |
|-----------|----------------|
| `ProjectFeatureView` | Feature card grid for a project at `#/projects/{projectId}`. Breadcrumb, empty state. |
| `FeatureCard` | Feature name, progress bar, Board/Docs action links. |
| `FeatureBoardView` | Wraps KanbanBoard with project/feature dropdowns, breadcrumb, Board/Docs tabs. |
| `FeatureDocsView` | Wraps DocViewer scoped to feature. Project/feature dropdowns, breadcrumb, Board/Docs tabs. |
| `ContextDropdowns` | Shared project and feature dropdown selectors. Emits navigation on selection change. |
| `Breadcrumb` | Renders `Overview / {project} / {feature}` with clickable segments. |
| `AddProjectDialog` | Path input (text field + native picker where supported) for registering a project. |

### Client -- New Hooks

| Hook | Responsibility |
|------|----------------|
| `useFeatureList` | Fetches `GET /api/projects/{projectId}/features` via HTTP. Returns `FeatureSummary[]`. |
| `useFeatureState` | Fetches feature-level `state` and `plan` via HTTP. Returns `DeliveryState` and `ExecutionPlan`. |
| `useAddProject` | POST `/api/projects` with path. Returns result/error. |
| `useRemoveProject` | DELETE `/api/projects/:id`. Returns result/error. |

### Client -- Modified Modules

| Module | Changes |
|--------|---------|
| `useRouter.ts` | Extend Route union with `project`, `feature-board`, `feature-docs` views. Extend `parseHash` regex patterns. |
| `useProjectList.ts` | No structural change; receives extended `ProjectSummary` with `featureCount` and `features`. |
| `ProjectCard.tsx` | Display `featureCount` and aggregated feature status. Navigate to `#/projects/{projectId}` on click. |
| `OverviewDashboard.tsx` | Add "Add Project" button. Handle empty state with call-to-action. |
| `App.tsx` | Route dispatch for new views (`project`, `feature-board`, `feature-docs`). |

## Integration Patterns

### REST API Design

All endpoints use JSON. Error responses follow `{ error: string }` pattern.

#### Existing (unchanged)
- `GET /api/projects` -- returns `ProjectSummary[]` (now with `featureCount`, `features`)
- `GET /api/projects/:id/state` -- project-root DeliveryState
- `GET /api/projects/:id/plan` -- project-root ExecutionPlan
- `GET /api/projects/:id/docs/tree` -- project-root DocTree
- `GET /api/projects/:id/docs/content?path=...` -- project-root doc content

#### New: Project Management
- `POST /api/projects` -- body: `{ path: string }`. Validates path, derives projectId from folder name, registers. Returns `ProjectSummary` on success, `{ error: string }` on failure (400 for invalid path, 409 for duplicate).
- `DELETE /api/projects/:id` -- unregisters project. Returns 204 on success, 404 if not found.

#### New: Feature Discovery
- `GET /api/projects/:id/features` -- returns `FeatureSummary[]`. Scans `docs/feature/` on-demand (small scale, no caching needed for 1-5 features).

#### New: Feature-Level Artifacts
- `GET /api/projects/:id/features/:featureId/state` -- reads `execution-log.yaml` from `docs/feature/{featureId}/`. Returns DeliveryState. Returns 404 if file missing (not an error -- delivery not started).
- `GET /api/projects/:id/features/:featureId/plan` -- reads `roadmap.yaml` from `docs/feature/{featureId}/`. Returns ExecutionPlan. Returns 404 if missing.
- `GET /api/projects/:id/features/:featureId/docs/tree` -- DocTree scoped to `docs/feature/{featureId}/`.
- `GET /api/projects/:id/features/:featureId/docs/content?path=...` -- doc content from feature-scoped docs root.

### WebSocket Protocol

#### Existing messages (unchanged)
- Server -> Client: `project_list`, `init`, `update`, `project_removed`, `parse_error`
- Client -> Server: `subscribe`, `unsubscribe`

#### Extension: Feature-aware `ProjectSummary`
The `project_list` message already sends `ProjectSummary[]`. The extended `ProjectSummary` includes `featureCount` and `features` fields. No new message types needed for feature list -- clients use HTTP for feature details.

#### Decision: No feature-level WebSocket subscriptions
Feature-level delivery state (board view) uses HTTP polling or one-shot fetch, not WebSocket subscriptions. Rationale:
- Scale is 1-5 features per project, updated infrequently (minutes apart)
- Adding feature-level subscriptions would require significant changes to `SubscriptionServer` and the client subscription model
- HTTP fetch on navigation + manual refresh is sufficient for this scale
- The existing project-level WebSocket handles the overview dashboard updates

### Data Flow: Add Project

```
User clicks "Add Project" -> enters path
  -> SPA: POST /api/projects { path: "/Users/.../karateka" }
  -> Server: validate path exists (fs.access)
  -> Server: derive projectId from basename (createProjectId)
  -> Server: check duplicate in registry
  -> Server: resolve ProjectConfig (statePath, planPath, docsRoot)
  -> Server: registry.add(config)
  -> Server: manifestStore.save(updatedEntries)
  -> Server: wsServer.notifyProjectListChange()
  -> Server: return ProjectSummary
  -> SPA: project appears in overview (via WS project_list update)
```

### Data Flow: Feature Board Navigation

```
User navigates to #/projects/nw-teams/features/doc-viewer/board
  -> SPA: parseHash -> { view: 'feature-board', projectId: 'nw-teams', featureId: 'doc-viewer' }
  -> SPA: useFeatureState hook fires
  -> SPA: GET /api/projects/nw-teams/features/doc-viewer/plan
  -> Server: pathResolver('nw-teams', 'doc-viewer') -> .../docs/feature/doc-viewer/roadmap.yaml
  -> Server: readFile + parsePlanYaml -> ExecutionPlan
  -> SPA: GET /api/projects/nw-teams/features/doc-viewer/state
  -> Server: pathResolver -> .../docs/feature/doc-viewer/execution-log.yaml
  -> Server: readFile + parseStateYaml -> DeliveryState (or 404 if not started)
  -> SPA: renders KanbanBoard with state + plan (or empty board if 404)
```

### Data Flow: Feature Docs Navigation

```
User navigates to #/projects/nw-teams/features/doc-viewer/docs
  -> SPA: parseHash -> { view: 'feature-docs', projectId: 'nw-teams', featureId: 'doc-viewer' }
  -> SPA: GET /api/projects/nw-teams/features/doc-viewer/docs/tree
  -> Server: featureDocsRoot = pathResolver('nw-teams', 'doc-viewer') -> .../docs/feature/doc-viewer/
  -> Server: scanDocsDir(featureDocsRoot) -> DirEntry[] -> buildDocTree -> DocTree
  -> SPA: renders DocViewer with feature-scoped tree
  -> User clicks a doc file
  -> SPA: GET /api/projects/nw-teams/features/doc-viewer/docs/content?path=design/architecture-design.md
  -> Server: validateDocPath(featureDocsRoot, 'design/architecture-design.md') -> readDocContent
```

## Pure Core / Effect Shell Boundaries

### Pure Functions (no IO, fully testable)
- `resolveFeaturePaths(projectPath, featureId)` -- returns artifact paths
- `deriveFeatureSummary(featureId, plan?, state?)` -- computes FeatureSummary from parsed artifacts
- `validateManifest(raw)` -- validates persisted manifest JSON
- `parseHash(hash)` -- extended route parser
- Existing: `buildDocTree`, `validateDocPath`, `computeTransitions`, `computeDiscoveryDiff`

### IO Adapters (effect boundary)
- `scanFeatureDirs(projectPath)` -- reads `docs/feature/` subdirectories
- `loadManifest(path)` / `saveManifest(path, data)` -- JSON file read/write
- `readFeatureArtifact(path)` -- reads YAML file
- Existing: `scanDocsDir`, `readDocContent`, `createFileWatcher`

## Quality Attribute Strategies

| Attribute | Strategy |
|-----------|----------|
| **Maintainability** | Pure core / effect shell separation. New modules follow existing patterns. Feature discovery mirrors project discovery structure. |
| **Testability** | All business logic in pure functions. IO adapters injectable via dependency ports. Result types for error handling. |
| **Reliability** | Missing artifacts (no execution-log, no docs/feature/) are normal states, not errors. Path validation prevents traversal. Manifest persistence survives restarts. |
| **Usability** | Context dropdowns eliminate back-navigation. Breadcrumbs provide orientation. Empty states provide guidance. |
| **Performance** | HTTP fetch per navigation (no caching needed at 2-5 projects, 1-5 features). Feature scan is synchronous readdir -- sub-millisecond. |
| **Simplicity** | No new dependencies. Reuses existing components (KanbanBoard, DocViewer). HTTP for feature data instead of WebSocket complexity. |

## Deployment Architecture

No change. Single Node.js process serves HTTP + WebSocket. SPA served via Vite dev server or static build. Manifest file at `~/.nwave/projects.json` persists project registrations.

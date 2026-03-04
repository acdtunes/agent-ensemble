# Multi-Project Selector -- Component Boundaries

## Server Modules

### New Modules

#### `board/server/manifest-store.ts`
- **Responsibility**: Load and save the project manifest file (`~/.nwave/projects.json`)
- **Pure core**:
  - `validateManifest(raw: unknown)` -- validates JSON structure, returns `Result<ProjectManifest, string>`
  - `addEntry(manifest, entry)` -- returns new manifest with entry added (immutable)
  - `removeEntry(manifest, projectId)` -- returns new manifest with entry removed (immutable)
  - `findDuplicate(manifest, path)` -- checks if path already registered
- **IO adapter**:
  - `loadManifest(filePath)` -- reads JSON file, returns `Result<ProjectManifest, string>`
  - `saveManifest(filePath, manifest)` -- writes JSON file atomically
  - `ensureManifestDir(filePath)` -- creates `~/.nwave/` if it does not exist
- **Dependencies (inward)**: `shared/types.ts` (ManifestEntry, ProjectManifest, Result)
- **Depended on by**: `multi-project-server.ts` (composition root)

#### `board/server/feature-discovery.ts`
- **Responsibility**: Scan a project's `docs/feature/` directory and produce feature summaries
- **Pure core**:
  - `deriveFeatureSummary(featureId, plan?, state?)` -- computes FeatureSummary from optional parsed artifacts
  - `isFeatureDir(name)` -- predicate for valid feature directory names
- **IO adapter**:
  - `scanFeatureDirs(projectPath)` -- reads `docs/feature/` subdirectories, returns feature directory names
  - `loadFeatureArtifacts(projectPath, featureId)` -- reads roadmap.yaml and execution-log.yaml, returns parsed results
  - `discoverFeatures(projectPath)` -- orchestrates scan + load + derive for all features
- **Dependencies (inward)**: `shared/types.ts` (FeatureSummary, Result), `parser.ts` (parseStateYaml, parsePlanYaml)
- **Depended on by**: `index.ts` (HTTP routes), `multi-project-server.ts`

#### `board/server/feature-path-resolver.ts`
- **Responsibility**: Pure path resolution from (projectPath, featureId) to artifact locations
- **Pure functions only (no IO)**:
  - `resolveFeatureDir(projectPath, featureId)` -- returns `{projectPath}/docs/feature/{featureId}`
  - `resolveFeatureRoadmap(projectPath, featureId)` -- returns path to `roadmap.yaml`
  - `resolveFeatureExecutionLog(projectPath, featureId)` -- returns path to `execution-log.yaml`
  - `resolveFeatureDocsRoot(projectPath, featureId)` -- returns path for doc tree scoping
- **Dependencies (inward)**: none (uses only `node:path`)
- **Depended on by**: `feature-discovery.ts`, `index.ts` (HTTP routes)

### Modified Modules

#### `board/server/index.ts`
- **New routes added**:
  - `POST /api/projects` -- add project (accepts JSON body, calls manifest store + registry)
  - `DELETE /api/projects/:id` -- remove project (calls manifest store + registry)
  - `GET /api/projects/:id/features` -- feature list (calls feature discovery)
  - `GET /api/projects/:id/features/:featureId/state` -- feature delivery state
  - `GET /api/projects/:id/features/:featureId/plan` -- feature execution plan
  - `GET /api/projects/:id/features/:featureId/docs/tree` -- feature-scoped doc tree
  - `GET /api/projects/:id/features/:featureId/docs/content` -- feature-scoped doc content
- **Modified**: `createMultiProjectHttpApp` deps interface extended with `manifestStore`, `featureDiscovery`, `pathResolver` ports
- **Added**: `express.json()` middleware for POST body parsing

#### `board/server/multi-project-server.ts`
- **Modified**: `createMultiProjectServer` loads manifest on startup, registers all persisted projects
- **Modified**: `toConfig` uses project path from manifest (not just PROJECTS_ROOT)
- **Extended**: `MultiProjectServerConfig` includes optional `manifestPath` (default `~/.nwave/projects.json`)
- **Extended**: Wires manifest store, feature discovery, and path resolver into HTTP deps

#### `board/shared/types.ts`
- **New types**: `FeatureSummary`, `FeatureId` (branded), `createFeatureId`, `ManifestEntry`, `ProjectManifest`
- **Extended**: `ProjectSummary` with `featureCount` and `features` fields
- **Extended**: `ProjectConfig` with `projectPath` (absolute path to project root)

#### `board/server/registry.ts`
- **No structural changes**. The existing `add`/`remove` interface is sufficient. The composition root maps manifest entries to `ProjectConfig` before calling `registry.add()`.

#### `board/server/discovery.ts`
- **No changes**. PROJECTS_ROOT discovery remains as optional secondary source. The composition root decides whether to activate it based on config.

## Client Modules

### New Components

#### `board/src/components/ProjectFeatureView.tsx`
- **Responsibility**: Feature card grid for a project. Displayed at `#/projects/{projectId}`.
- **Props**: `projectId`, `features: FeatureSummary[]`, `projectName`, navigation callbacks
- **Contains**: Breadcrumb, feature grid, empty state
- **Pure component**: receives data, renders UI

#### `board/src/components/FeatureCard.tsx`
- **Responsibility**: Single feature card showing name, progress, Board/Docs links
- **Props**: `feature: FeatureSummary`, `projectId`, navigation callbacks
- **Pure component**: stateless, derives display values from FeatureSummary

#### `board/src/components/FeatureBoardView.tsx`
- **Responsibility**: Feature-level board view wrapper
- **Props**: `projectId`, `featureId`, navigation callbacks, project/feature lists for dropdowns
- **Contains**: ContextDropdowns, Breadcrumb, Board/Docs tabs, KanbanBoard (reused)
- **Uses hooks**: `useFeatureState`

#### `board/src/components/FeatureDocsView.tsx`
- **Responsibility**: Feature-level docs view wrapper
- **Props**: `projectId`, `featureId`, navigation callbacks, project/feature lists for dropdowns
- **Contains**: ContextDropdowns, Breadcrumb, Board/Docs tabs, DocViewer (reused)
- **Uses hooks**: `useDocTree` (with feature-scoped URL), `useDocContent` (with feature-scoped URL)

#### `board/src/components/ContextDropdowns.tsx`
- **Responsibility**: Project and Feature dropdown selectors
- **Props**: `projects`, `features`, `currentProjectId`, `currentFeatureId`, `onProjectChange`, `onFeatureChange`, `featureFilter?` (board: roadmap-only, docs: all)
- **Pure component**: emits selection changes via callbacks

#### `board/src/components/Breadcrumb.tsx`
- **Responsibility**: Navigation breadcrumb showing `Overview / {project} / {feature}`
- **Props**: `segments: BreadcrumbSegment[]` (label + hash)
- **Pure component**: renders clickable segments

#### `board/src/components/AddProjectDialog.tsx`
- **Responsibility**: Dialog for entering a project path and submitting
- **Props**: `onSubmit: (path: string) => void`, `onCancel`, `error?`, `loading?`
- **Contains**: Text input, optional native folder picker button, submit/cancel actions

### New Hooks

#### `board/src/hooks/useFeatureList.ts`
- **Responsibility**: Fetch feature list for a project via HTTP
- **Port**: `GET /api/projects/{projectId}/features`
- **Returns**: `{ features: FeatureSummary[], loading, error, refetch }`

#### `board/src/hooks/useFeatureState.ts`
- **Responsibility**: Fetch feature-level delivery state and plan via HTTP
- **Ports**: `GET /api/projects/{projectId}/features/{featureId}/state`, `GET /api/projects/{projectId}/features/{featureId}/plan`
- **Returns**: `{ state: DeliveryState | null, plan: ExecutionPlan | null, loading, error }`
- **Handles**: 404 for missing execution-log (returns null state, plan still loaded)

#### `board/src/hooks/useAddProject.ts`
- **Responsibility**: POST to add a project
- **Port**: `POST /api/projects`
- **Returns**: `{ addProject: (path: string) => Promise<Result>, loading, error }`

#### `board/src/hooks/useRemoveProject.ts`
- **Responsibility**: DELETE to remove a project
- **Port**: `DELETE /api/projects/:id`
- **Returns**: `{ removeProject: (projectId: string) => Promise<Result>, loading, error }`

### Modified Modules

#### `board/src/hooks/useRouter.ts`
- **Extended**: Route union with `project`, `feature-board`, `feature-docs` variants
- **Extended**: `parseHash` with new regex patterns for `#/projects/:id`, `#/projects/:id/features/:featureId/board`, `#/projects/:id/features/:featureId/docs`
- **Pure function changes only**: no structural refactoring needed

#### `board/src/components/ProjectCard.tsx`
- **Extended**: Display `featureCount` and aggregated feature status
- **Modified**: `onNavigate` emits `projectId` for routing to `#/projects/{projectId}` (feature view) instead of `#/projects/{projectId}/board`

#### `board/src/components/OverviewDashboard.tsx`
- **Extended**: "Add Project" button, AddProjectDialog integration
- **Extended**: "Remove" action per project card
- **Modified**: Empty state guidance updated with call-to-action

#### `board/src/hooks/useDocTree.ts`
- **Extended**: Accept optional `featureId` parameter to construct feature-scoped URL
- **URL pattern**: `featureId ? /api/projects/${projectId}/features/${featureId}/docs/tree : /api/projects/${projectId}/docs/tree`

#### `board/src/hooks/useDocContent.ts`
- **Extended**: Accept optional `featureId` parameter for feature-scoped content URL
- **URL pattern**: `featureId ? /api/projects/${projectId}/features/${featureId}/docs/content?path=... : /api/projects/${projectId}/docs/content?path=...`

## Pure/IO Boundary Analysis

### Pure Functions (zero side effects)

| Module | Function | Input | Output |
|--------|----------|-------|--------|
| `feature-path-resolver.ts` | `resolveFeatureDir` | projectPath, featureId | absolute path |
| `feature-path-resolver.ts` | `resolveFeatureRoadmap` | projectPath, featureId | absolute path |
| `feature-path-resolver.ts` | `resolveFeatureExecutionLog` | projectPath, featureId | absolute path |
| `feature-path-resolver.ts` | `resolveFeatureDocsRoot` | projectPath, featureId | absolute path |
| `feature-discovery.ts` | `deriveFeatureSummary` | featureId, plan?, state? | FeatureSummary |
| `feature-discovery.ts` | `isFeatureDir` | name | boolean |
| `manifest-store.ts` | `validateManifest` | unknown | Result<ProjectManifest, string> |
| `manifest-store.ts` | `addEntry` | manifest, entry | ProjectManifest |
| `manifest-store.ts` | `removeEntry` | manifest, projectId | ProjectManifest |
| `manifest-store.ts` | `findDuplicate` | manifest, path | ManifestEntry or undefined |
| `shared/types.ts` | `createFeatureId` | raw string | Result<FeatureId, string> |
| `useRouter.ts` | `parseHash` | hash string | Route |

### IO Adapters (effect boundary)

| Module | Function | Effect |
|--------|----------|--------|
| `manifest-store.ts` | `loadManifest` | fs.readFile |
| `manifest-store.ts` | `saveManifest` | fs.writeFile |
| `manifest-store.ts` | `ensureManifestDir` | fs.mkdir |
| `feature-discovery.ts` | `scanFeatureDirs` | fs.readdir |
| `feature-discovery.ts` | `loadFeatureArtifacts` | fs.readFile |
| `feature-discovery.ts` | `discoverFeatures` | scanFeatureDirs + loadFeatureArtifacts |
| `index.ts` | HTTP route handlers | Express req/res |

### Dependency Direction

All dependencies point inward: IO adapters depend on pure core, never the reverse.

```
IO Adapters (Express routes, fs operations)
  -> Pure Core (path resolver, feature summary, manifest operations)
    -> Types (FeatureSummary, ManifestEntry, Result, branded types)
```

## File Inventory

### New Production Files (server): 3
- `board/server/manifest-store.ts`
- `board/server/feature-discovery.ts`
- `board/server/feature-path-resolver.ts`

### New Production Files (client): 9
- `board/src/components/ProjectFeatureView.tsx`
- `board/src/components/FeatureCard.tsx`
- `board/src/components/FeatureBoardView.tsx`
- `board/src/components/FeatureDocsView.tsx`
- `board/src/components/ContextDropdowns.tsx`
- `board/src/components/Breadcrumb.tsx`
- `board/src/components/AddProjectDialog.tsx`
- `board/src/hooks/useFeatureList.ts`
- `board/src/hooks/useFeatureState.ts`

### New Production Files (shared): 0
- Types are added to existing `board/shared/types.ts`

### Modified Production Files: 8
- `board/shared/types.ts`
- `board/server/index.ts`
- `board/server/multi-project-server.ts`
- `board/src/hooks/useRouter.ts`
- `board/src/hooks/useDocTree.ts`
- `board/src/hooks/useDocContent.ts`
- `board/src/components/ProjectCard.tsx`
- `board/src/components/OverviewDashboard.tsx`

### Total: 12 new + 8 modified = 20 production files

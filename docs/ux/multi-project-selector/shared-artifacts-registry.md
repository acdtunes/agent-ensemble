# Shared Artifacts Registry: Multi-Project Selector

## Artifacts

### projectPaths
- **Source of truth**: User-selected folders via "Add Project" UI, persisted internally by the server
- **Consumers**:
  - Server project registration (resolves to filesystem directories)
  - Project card subtitle (shows abbreviated path)
  - Feature discovery (scans `docs/feature/` within each path)
  - Doc viewer (serves docs from within each path)
- **Owner**: Server persistence layer (internal file, not user-edited)
- **Integration risk**: HIGH -- invalid paths cause registration errors; moved/deleted project directories produce error-state entries
- **Validation**: Server validates path exists when user adds a project; already-registered projects with missing paths show error state on overview

### projectId
- **Source of truth**: Derived from folder name (slugified) when user adds a project via UI
- **Consumers**:
  - URL hash routing (`#/projects/{projectId}`, `#/projects/{projectId}/features/...`)
  - Project registry Map keys
  - WebSocket subscription keys
  - API endpoint parameters (`/api/projects/{projectId}/...`)
  - Breadcrumb navigation display
  - Project card title
- **Owner**: Server (derived from folder name on add)
- **Integration risk**: HIGH -- ID mismatch between derived ID and URL routing breaks navigation; must match `ProjectId` brand type pattern
- **Validation**: Server validates derived IDs against `createProjectId()` pattern; invalid folder names produce validation error on add

### featureId
- **Source of truth**: Directory name under `docs/feature/` within each project path
- **Consumers**:
  - URL hash routing (`#/projects/{projectId}/features/{featureId}/board`)
  - Feature card title
  - Feature board data loading (roadmap.yaml, execution-log.yaml paths)
  - Feature doc viewer (docs root scoped to feature directory)
  - Breadcrumb navigation
- **Owner**: Filesystem (directory name)
- **Integration risk**: MEDIUM -- directory rename changes the featureId, breaking deep links; however, this is expected behavior for a filesystem-derived identifier
- **Validation**: Feature IDs are sanitized/slugified if necessary; URL parameter matches actual directory name

### featureList
- **Source of truth**: `GET /api/projects/{projectId}/features` (or server-side scan of `docs/feature/` directories)
- **Consumers**:
  - Project feature view (feature cards)
  - Feature count on project overview cards
- **Owner**: Server feature discovery module
- **Integration risk**: MEDIUM -- stale feature list if directories are added/removed while server is running; polling or file watching mitigates
- **Validation**: Feature count on overview card matches count of feature cards in project view

### hasRoadmap
- **Source of truth**: Existence check of `docs/feature/{featureId}/roadmap.yaml` within project path
- **Consumers**:
  - Feature card (conditional "Board" link rendering)
- **Owner**: Server feature discovery module
- **Integration risk**: LOW -- boolean flag derived from filesystem; false positive (file exists but unparseable) handled by parse error on board load
- **Validation**: "Board" link only appears when roadmap.yaml exists; clicking "Board" either loads board or shows parse error

### featureRoadmap
- **Source of truth**: `docs/feature/{featureId}/roadmap.yaml` file within project path
- **Consumers**:
  - Feature board (kanban columns and step cards)
  - Progress header (total steps, total layers)
- **Owner**: Execution tooling (writes roadmap during planning phase)
- **Integration risk**: MEDIUM -- roadmap format must match existing `ExecutionPlan` parser
- **Validation**: Parsed using existing `parsePlanYaml()` function; parse errors surface as diagnostic messages

### featureState
- **Source of truth**: `docs/feature/{featureId}/execution-log.yaml` file within project path
- **Consumers**:
  - Feature board (card statuses, teammate assignments)
  - Progress header (completion metrics, current phase)
  - Feature card on project view (summary metrics)
- **Owner**: Execution tooling (writes state during delivery)
- **Integration risk**: MEDIUM -- state format must match existing `DeliveryState` parser
- **Validation**: Parsed using existing `parseStateYaml()` function; parse errors surface as diagnostic messages

### projectSummary
- **Source of truth**: Aggregated from feature scan + feature state for each registered project
- **Consumers**:
  - Overview project cards (feature count, aggregated progress)
- **Owner**: Server aggregation logic
- **Integration risk**: LOW -- derived data; inconsistency means stale summary, resolved on next refresh
- **Validation**: Feature count matches `featureList` length; progress percentages match individual feature metrics

## Consistency Rules

1. `projectId` derived from folder name MUST match `projectId` in URL routing and API endpoints across all views
2. `featureId` from filesystem directory name MUST match `featureId` in URL routing
3. Feature count on overview project card MUST equal the number of feature cards shown in project view
4. "Board" link on feature card MUST only appear when `hasRoadmap` is true
5. Breadcrumb segments MUST be clickable and navigate to the correct level (overview, project, feature)
6. Error states MUST reference the relevant filesystem path for debugging
7. Adding a project via UI MUST immediately reflect on the overview (no page refresh required)
8. Removing a project via UI MUST immediately remove the card from the overview

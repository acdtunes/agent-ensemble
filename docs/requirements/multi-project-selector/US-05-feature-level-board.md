# US-05: Feature-Level Board View

## Problem
Andres navigates to a feature within a project and clicks "Board". Currently the board only knows how to display a project-root-level `state.yaml` and `plan.yaml`. But his feature `doc-viewer` has its own `roadmap.yaml` and `execution-log.yaml` in `docs/feature/doc-viewer/`. The board cannot load feature-level delivery data. He needs the existing kanban board to work with feature-scoped artifacts.

## Who
- Solo developer | Has selected a specific feature within a project | Wants to see the kanban delivery board for that feature's roadmap and execution state

## Solution
Extend the board view to accept feature-level delivery artifacts. The route `#/projects/{projectId}/features/{featureId}/board` loads `roadmap.yaml` and `execution-log.yaml` from `docs/feature/{featureId}/` within the project path. The existing board components (progress header, kanban columns, file cards) render this data identically to how they render project-root data. The header includes **project and feature dropdown selectors** so the user can switch project or feature without leaving the board view. The breadcrumb updates to show the full path: `Overview / {project} / {feature}`.

## Job Story Trace
- JS-03: Navigate to a Feature Within a Project

## Domain Examples

### 1: Happy Path -- Andres views doc-viewer board
Andres navigates to `#/projects/nw-teams/features/doc-viewer/board`. The server loads `docs/feature/doc-viewer/roadmap.yaml` (14 steps across 3 layers) and `docs/feature/doc-viewer/execution-log.yaml` (8 completed, 2 active, 1 failed, 3 queued). The board renders with the existing kanban layout: columns for Queued, Active, Review, Done. The progress header shows "8/14 (57%) -- Phase 2 of 3". The breadcrumb shows "Overview / nw-teams / doc-viewer" with each segment clickable.

### 2: Edge Case -- Feature has roadmap but no execution state yet
Andres navigates to the board for `multi-project-board` feature. It has a `roadmap.yaml` with 10 planned steps but no `execution-log.yaml` (delivery has not started). The board shows all 10 steps in the Queued column with "pending" status. The progress header shows "0/10 (0%) -- Not started".

### 3: Error/Boundary -- Roadmap parse failure
Andres navigates to the board for `broken-experiment`. The `roadmap.yaml` exists but has a YAML syntax error on line 15. The board view shows an error message: "Failed to parse roadmap.yaml: unexpected token at line 15" with the file path `/Users/andres.dandrea/.../docs/feature/broken-experiment/roadmap.yaml` displayed for debugging.

## UAT Scenarios (BDD)

### Scenario 1: Feature board loads from feature-level artifacts
```gherkin
Scenario: Board renders feature-level delivery data
  Given Andres navigates to "#/projects/nw-teams/features/doc-viewer/board"
  And "doc-viewer" has roadmap.yaml with 14 steps across 3 layers
  And "doc-viewer" has execution-log.yaml with 8 completed, 2 in progress, 1 failed
  When the board loads
  Then the kanban columns show cards organized by status
  And the progress header shows "8/14 (57%)"
  And the progress header shows "Phase 2 of 3"
```

### Scenario 2: Feature without execution state shows all queued
```gherkin
Scenario: Board for feature without execution-log shows all steps as pending
  Given Andres navigates to "#/projects/nw-teams/features/multi-project-board/board"
  And "multi-project-board" has roadmap.yaml with 10 steps
  And "multi-project-board" has no execution-log.yaml
  When the board loads
  Then all 10 cards appear in the Queued column
  And the progress header shows "0/10 (0%)"
  And the progress header shows "Not started"
```

### Scenario 3: Board breadcrumb shows full hierarchy
```gherkin
Scenario: Breadcrumb reflects project and feature context
  Given Andres is viewing the board at "#/projects/nw-teams/features/doc-viewer/board"
  Then the breadcrumb shows "Overview / nw-teams / doc-viewer"
  And clicking "nw-teams" navigates to "#/projects/nw-teams"
  And clicking "Overview" navigates to "#/"
```

### Scenario 4: Board-to-Docs tab switching within feature
```gherkin
Scenario: Tab switching between Board and Docs within feature context
  Given Andres is viewing the board for "doc-viewer" in "nw-teams"
  And tabs show "Board" (active) and "Docs"
  When Andres clicks the "Docs" tab
  Then the URL changes to "#/projects/nw-teams/features/doc-viewer/docs"
  And the doc viewer loads documentation from docs/feature/doc-viewer/
```

### Scenario 5: Switch feature from board view via dropdown
```gherkin
Scenario: Feature dropdown in board header allows switching features
  Given Andres is viewing the board for "doc-viewer" in project "nw-teams"
  And the header shows a feature dropdown with "doc-viewer" selected
  And the dropdown lists all features: "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
  When Andres selects "card-redesign" from the feature dropdown
  Then the URL changes to "#/projects/nw-teams/features/card-redesign/board"
  And the board reloads with "card-redesign" delivery data
```

### Scenario 6: Switch project from board view via dropdown
```gherkin
Scenario: Project dropdown in board header allows switching projects
  Given Andres is viewing the board for "doc-viewer" in project "nw-teams"
  And the header shows a project dropdown with "nw-teams" selected
  When Andres selects "karateka" from the project dropdown
  Then the URL changes to "#/projects/karateka"
  And the feature list for "karateka" is displayed
```

### Scenario 7: Feature dropdown only shows board-capable features
```gherkin
Scenario: Feature dropdown in board view only lists features with roadmaps
  Given project "nw-teams" has features "doc-viewer" (has roadmap) and "notes" (no roadmap)
  When Andres opens the feature dropdown in the board view
  Then "doc-viewer" is listed
  And "notes" is not listed (no roadmap, cannot show board)
```

### Scenario 8: Roadmap parse error shows diagnostic
```gherkin
Scenario: Malformed roadmap shows parse error with file path
  Given Andres navigates to "#/projects/nw-teams/features/broken-experiment/board"
  And "broken-experiment" has a malformed roadmap.yaml
  When the board loads
  Then an error message is displayed with the parse error details
  And the file path to roadmap.yaml is shown for debugging
```

## Acceptance Criteria
- [ ] Route `#/projects/{projectId}/features/{featureId}/board` loads feature-level delivery artifacts
- [ ] Board reads `roadmap.yaml` from `docs/feature/{featureId}/` within the project path
- [ ] Board reads `execution-log.yaml` from `docs/feature/{featureId}/` within the project path
- [ ] When execution-log is missing, all steps render as "pending" in the Queued column
- [ ] Existing board components (kanban columns, file cards, progress header) render feature data identically to project-root data
- [ ] **Project dropdown** in the header lists all registered projects; selecting one navigates to that project's feature list
- [ ] **Feature dropdown** in the header lists all board-capable features (with roadmap) for the current project; selecting one switches the board to that feature
- [ ] Breadcrumb shows `Overview / {projectName} / {featureName}` with all segments clickable
- [ ] Board and Docs tabs switch between `#/.../board` and `#/.../docs` within the same feature context
- [ ] Roadmap parse errors display diagnostic with file path

## Technical Notes
- The existing board components (`KanbanBoard`, `FileCard`, `ProgressHeader`, `LayerLane`) consume `DeliveryState` and `ExecutionPlan` types. They should not change -- only the data source changes (feature-level files instead of project-root files).
- The server needs to resolve feature artifact paths: given `projectId` and `featureId`, construct paths like `{projectPath}/docs/feature/{featureId}/roadmap.yaml`. This path resolution should be a pure function.
- The WebSocket subscription model may need extension: subscribe to a feature's state file changes (not just project-root state).
- The `useDeliveryState` hook currently connects to a project-level WebSocket. It may need a `featureId` parameter to scope the subscription.
- File watching needs to watch feature-level `execution-log.yaml` files, not just project-root `state.yaml`.
- Functional programming paradigm: path resolution is pure; file watching uses existing adapter pattern.

## Dependencies
- US-01 (Project Manifest Registration) -- project paths must be available
- US-02 (Feature Discovery) -- features must be discovered to validate featureId
- US-04 (Project Feature View) -- feature view provides the navigation entry point

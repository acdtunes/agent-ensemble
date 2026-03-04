# US-06: Feature-Level Documentation View

## Problem
Andres is on the feature board for `doc-viewer` and wants to review the design documents for that feature. The existing doc viewer is scoped to the entire project's `docs/` directory. He needs the doc viewer to scope to the feature's directory (`docs/feature/doc-viewer/`) when accessed from a feature context, so he sees only the relevant documentation (discuss/, design/, distill/ for that feature) without wading through unrelated project-level docs.

## Who
- Solo developer | Has selected a specific feature and wants to review its documentation | Wants to see only that feature's docs (discuss, design, distill subdirectories) without project-wide noise

## Solution
When the user navigates to `#/projects/{projectId}/features/{featureId}/docs`, the doc viewer scopes its tree to `docs/feature/{featureId}/` within the project path. The sidebar shows only directories and files within that feature's folder. The header includes **project and feature dropdown selectors** (same as the board view) so the user can switch project or feature without leaving the docs view. The copy-path button still copies paths relative to the project root. The breadcrumb reflects the full hierarchy.

## Job Story Trace
- JS-03: Navigate to a Feature Within a Project

## Domain Examples

### 1: Happy Path -- Andres reviews doc-viewer design docs
Andres clicks "Docs" on the `doc-viewer` feature card in the `nw-teams` project. The URL changes to `#/projects/nw-teams/features/doc-viewer/docs`. The doc tree sidebar shows:
```
v discuss (4)
  jtbd-analysis.md
  journey-doc-review.yaml
  ...
v design (3)
  architecture-design.md
  component-boundaries.md
  data-models.md
v distill (3)
  walking-skeleton.md
  acceptance-review.md
  test-scenarios.md
```
He clicks `architecture-design.md` and reads the rendered markdown. The file path shown is `docs/feature/doc-viewer/design/architecture-design.md` and the copy button copies this relative path.

### 2: Edge Case -- Feature has no documentation files
Feature `multi-project-board` has a directory but it contains only `roadmap.yaml` and `execution-log.yaml` with no markdown documentation files. The doc viewer shows an empty state: "No documentation files found for this feature."

### 3: Edge Case -- Switching between Board and Docs tabs
Andres is on the board for `doc-viewer` at `#/projects/nw-teams/features/doc-viewer/board`. He clicks the "Docs" tab. The URL changes to `#/projects/nw-teams/features/doc-viewer/docs`. He clicks "Board" tab. The URL changes back. The feature context is preserved throughout.

## UAT Scenarios (BDD)

### Scenario 1: Feature docs tree scoped to feature directory
```gherkin
Scenario: Doc viewer shows only feature-scoped documentation
  Given Andres navigates to "#/projects/nw-teams/features/doc-viewer/docs"
  And "doc-viewer" has subdirectories "discuss/", "design/", "distill/" with documentation
  When the doc viewer loads
  Then the sidebar tree shows only directories under docs/feature/doc-viewer/
  And project-level docs (ADRs, requirements) are not shown
```

### Scenario 2: Document content renders correctly from feature path
```gherkin
Scenario: Feature document renders with full markdown formatting
  Given Andres is viewing docs for feature "doc-viewer" in "nw-teams"
  When he clicks "architecture-design.md" in the design/ folder
  Then the document renders with proper heading hierarchy, code blocks, and tables
  And the file path shown is "docs/feature/doc-viewer/design/architecture-design.md"
```

### Scenario 3: Copy path copies project-relative path
```gherkin
Scenario: Copy button copies path relative to project root
  Given Andres is viewing "docs/feature/doc-viewer/design/architecture-design.md"
  When he clicks the copy button
  Then "docs/feature/doc-viewer/design/architecture-design.md" is copied to clipboard
  And the button shows "Copied!" feedback for 2 seconds
```

### Scenario 4: Feature with no documentation shows empty state
```gherkin
Scenario: Feature without documentation files shows empty state
  Given Andres navigates to docs for feature "multi-project-board" in "nw-teams"
  And "multi-project-board" has no markdown files in its directory
  When the doc viewer loads
  Then an empty state message is shown: "No documentation files found for this feature"
```

### Scenario 5: Board-Docs tab switching preserves feature context
```gherkin
Scenario: Switching between Board and Docs stays within feature
  Given Andres is on "#/projects/nw-teams/features/doc-viewer/board"
  When he clicks the "Docs" tab
  Then the URL changes to "#/projects/nw-teams/features/doc-viewer/docs"
  When he clicks the "Board" tab
  Then the URL changes to "#/projects/nw-teams/features/doc-viewer/board"
  And the feature context "doc-viewer" is preserved throughout
```

### Scenario 6: Switch feature from docs view via dropdown
```gherkin
Scenario: Feature dropdown in docs header allows switching features
  Given Andres is viewing docs for "doc-viewer" in project "nw-teams"
  And the header shows a feature dropdown with "doc-viewer" selected
  And the dropdown lists all features: "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
  When Andres selects "card-redesign" from the feature dropdown
  Then the URL changes to "#/projects/nw-teams/features/card-redesign/docs"
  And the doc viewer reloads with "card-redesign" documentation
```

### Scenario 7: Switch project from docs view via dropdown
```gherkin
Scenario: Project dropdown in docs header allows switching projects
  Given Andres is viewing docs for "doc-viewer" in project "nw-teams"
  And the header shows a project dropdown with "nw-teams" selected
  When Andres selects "karateka" from the project dropdown
  Then the URL changes to "#/projects/karateka"
  And the feature list for "karateka" is displayed
```

### Scenario 8: Feature dropdown in docs view lists all features (including docs-only)
```gherkin
Scenario: Feature dropdown in docs view includes features without roadmaps
  Given project "nw-teams" has features "doc-viewer" (has roadmap) and "notes" (no roadmap)
  When Andres opens the feature dropdown in the docs view
  Then both "doc-viewer" and "notes" are listed
```

## Acceptance Criteria
- [ ] Route `#/projects/{projectId}/features/{featureId}/docs` renders doc viewer scoped to `docs/feature/{featureId}/`
- [ ] Doc tree sidebar shows only files within the feature directory
- [ ] Document rendering uses the same markdown renderer as the project-level doc viewer
- [ ] Copy-path button copies the path relative to the project root (e.g., `docs/feature/doc-viewer/design/...`)
- [ ] Empty feature directory shows "No documentation files found" empty state
- [ ] **Project dropdown** in the header lists all registered projects; selecting one navigates to that project's feature list
- [ ] **Feature dropdown** in the header lists all features for the current project (including docs-only features); selecting one switches the docs to that feature
- [ ] Board and Docs tabs switch URL suffix between `/board` and `/docs` within the same feature context (Board tab only shown if feature has roadmap)
- [ ] Breadcrumb shows `Overview / {project} / {feature}` with all segments clickable

## Technical Notes
- The existing `DocViewer`, `DocTree`, and `DocContent` components should be reusable -- they accept a `docsRoot` path and render the tree from there. The feature-level docs view changes the `docsRoot` to `{projectPath}/docs/feature/{featureId}/`.
- The server API `GET /api/projects/{projectId}/docs/tree` may need a `featureId` parameter to scope the tree, or a separate endpoint `GET /api/projects/{projectId}/features/{featureId}/docs/tree`.
- The `readDocContent` endpoint similarly needs feature scoping.
- The `getDocsRoot` function in `multi-project-server.ts` needs to handle feature-level docs root resolution.
- Functional programming paradigm: docs root resolution is a pure function from (projectPath, featureId) to absolute path.

## Dependencies
- US-01 (Project Manifest Registration) -- project paths must be available
- US-02 (Feature Discovery) -- features must be discovered
- US-04 (Project Feature View) -- feature view provides the navigation entry point
- Existing doc viewer components (from doc-viewer epic) must be available and working

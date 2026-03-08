# US-001: Project Page Tab Navigation

## Problem

Carla Rivera is a tech lead who regularly reviews project-wide documentation alongside the feature list. She finds it frustrating that the project page has no tab navigation -- the only way to reach project docs is by manually editing the URL to `#/projects/nw-teams/docs`. This is undiscoverable and inconsistent with the feature page, which provides clear Board | Docs tabs. Carla wastes time switching between views and sometimes doesn't realize project docs exist at all.

## Who

- Tech lead | On the project page reviewing features | Wants quick access to project-level documentation without leaving the project context

## Solution

Add Board | Docs tab navigation to the project page header, replacing the plain "Agent Ensemble" title. The Board tab shows the feature card list (current project page content). The Docs tab navigates to the existing project documentation viewer. This mirrors the navigation pattern already established on the feature page.

## Job Story

When I am on the project page reviewing the feature list and I need to check project-wide documentation, I want to switch to a documentation view directly from the project page, so I can find and read project docs without losing my place or navigating away from the project context.

## Domain Examples

### 1: Happy Path -- Carla checks architecture docs before sprint planning

Carla Rivera navigates to the nw-teams project page and sees the feature card list with Board | Docs tabs in the header. She clicks "Docs" and the page transitions to the documentation browser showing the project's doc tree (feature/, ux/, requirements/ directories). She clicks on `ux/auth-flow/journey.yaml` and reads the journey specification. Satisfied, she clicks "Board" to return to the feature list and continues planning.

### 2: Edge Case -- Project with no documentation

Diego Morales navigates to a newly created project "experiment-alpha" that has no docs/ directory yet. He sees the Board | Docs tabs in the header. When he clicks "Docs", the page shows "No documentation found" -- a clean empty state. He clicks "Board" to return to the feature list without confusion.

### 3: Error/Boundary -- Direct URL navigation to project docs

Priya Sharma receives a shared link `#/projects/nw-teams/docs` from a colleague. She opens it directly in her browser. The project Docs view loads correctly with the "Docs" tab active and the document tree visible, without needing to first visit the project feature list.

### 4: Edge Case -- Tab state consistency during navigation

Carla Rivera is on the nw-teams project Docs view reading a document. She clicks "Board" and lands on the feature card list with the Board tab active. She clicks "Docs" again and the documentation view reloads (previous document selection is not preserved, matching existing DocViewer behavior).

## UAT Scenarios (BDD)

### Scenario: Project page shows Board and Docs tabs

```gherkin
Given Carla Rivera navigates to the "nw-teams" project page
When the page loads
Then the header displays "Agent Ensemble" with "Board" and "Docs" tab links
And the "Board" tab is visually active with a blue underline
And the feature card list is displayed in the main content area
```

### Scenario: Clicking Docs tab navigates to documentation viewer

```gherkin
Given Carla Rivera is on the "nw-teams" project page with the Board tab active
When she clicks the "Docs" tab
Then the URL changes to "#/projects/nw-teams/docs"
And the "Docs" tab becomes visually active with a blue underline
And the document tree sidebar is displayed on the left
And the content pane shows "Select a document to view its contents"
```

### Scenario: Clicking Board tab returns to the feature list

```gherkin
Given Carla Rivera is viewing project docs at "#/projects/nw-teams/docs"
When she clicks the "Board" tab
Then the feature card list is displayed
And the "Board" tab is visually active
```

### Scenario: Empty documentation shows empty state

```gherkin
Given Diego Morales navigates to the "experiment-alpha" project docs view
And the project has no docs/ directory
When the page loads
Then the content area displays "No documentation found"
And the "Board" tab remains clickable for navigation
```

### Scenario: Direct URL to project docs works correctly

```gherkin
Given Priya Sharma opens "#/projects/nw-teams/docs" directly in the browser
When the page loads
Then the project Docs view is displayed with the document tree
And the "Docs" tab is visually active in the header
And the breadcrumb shows "Overview / nw-teams"
```

### Scenario: Documentation fetch error displays error message

```gherkin
Given Carla Rivera navigates to the "nw-teams" project Docs view
And the documentation API endpoint returns an error
When the page loads
Then an error message is displayed in the content area
And the "Board" tab remains clickable for navigation back to the feature list
```

## Acceptance Criteria

- [ ] Project page header displays Board | Docs tab navigation (replacing plain title)
- [ ] Board tab is visually active (blue underline) when viewing the feature list
- [ ] Docs tab navigates to `#/projects/{projectId}/docs` showing the existing DocViewer
- [ ] Docs tab is visually active when on the docs view
- [ ] Board tab from the docs view returns to the project feature list
- [ ] Empty state ("No documentation found") displays when project has no docs
- [ ] Error state displays when documentation API fails
- [ ] Direct URL navigation to `#/projects/{projectId}/docs` works correctly
- [ ] Tab visual style matches the existing feature-level FeatureNavHeader tabs (blue underline active indicator)
- [ ] Breadcrumb "Overview / {projectId}" remains visible in both views

## Technical Notes

- `ProjectTabs` component already exists (App.tsx:162-198) with Board | Docs tabs and correct styling
- `DocsView` component already exists (App.tsx:444-472) and already uses `ProjectTabs` with `activeTab="docs"`
- The primary change is in `ProjectView` (App.tsx:321-380): replace the plain `<h1>` headerContent with `<ProjectTabs projectId={projectId} activeTab="board" />`
- **Navigation alignment consideration**: Currently `ProjectTabs` Board tab links to `#/projects/{id}/board` which renders `BoardView` (the kanban roadmap), while the feature card list is at `#/projects/{id}` (`ProjectView`). Two options:
  - Option A: Change Board tab href to `#/projects/{id}` so it shows the feature list (matches user mental model of "project board = feature overview")
  - Option B: Keep Board tab linking to `/board` (roadmap) and add a third "Features" tab -- more complex, potentially confusing
  - **Recommendation**: Option A is simpler and more aligned with the user's expectation. The feature list IS the project board.
- No new API endpoints needed -- `useDocTree(projectId)` and the existing `/api/projects/{id}/docs/tree` endpoint are already wired
- No new components needed -- `ProjectTabs` and `DocViewer` are reused as-is
- The `useProjectList(WS_URL)` hook in `DocsView` provides `connectionStatus` for `PageShell`

## Dependencies

- None -- all required components, hooks, and API endpoints already exist
- Existing `ProjectTabs`, `DocsView`, `DocViewer`, `useDocTree`, and router patterns are the foundation

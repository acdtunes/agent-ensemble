# US-04: Project Feature View

## Problem
Andres clicks into a project on the board and currently sees a single delivery board. But his project `nw-teams` has 4 features, each with its own roadmap and execution state. There is no intermediate view showing which features exist, their delivery status, and whether they have boards or just documentation. He needs a feature selection view that acts as the project's home page.

## Who
- Solo developer | Has entered a specific project | Wants to see all features within that project and navigate to the one he needs

## Solution
A new project-level view at route `#/projects/{projectId}` that displays feature cards. Each card shows the feature name (from directory name), delivery progress (if `execution-log.yaml` exists), and links to "Board" (if `roadmap.yaml` exists) and "Docs" (always available if the feature directory has documentation files).

## Job Story Trace
- JS-03: Navigate to a Feature Within a Project

## Domain Examples

### 1: Happy Path -- Andres browses nw-teams features
Andres navigates to `#/projects/nw-teams`. The view shows "Features (4)" as a heading. Four feature cards appear: `kanban-board` (100% complete, Board + Docs), `card-redesign` (100% complete, Board + Docs), `doc-viewer` (57% complete, 2 active, Board + Docs), `multi-project-board` (no roadmap, Docs only). He clicks "Board" on `doc-viewer` to see its delivery board.

### 2: Edge Case -- Feature has roadmap but no execution state
Feature `multi-project-board` has a `roadmap.yaml` (14 planned steps) but no `execution-log.yaml` (delivery has not started). The feature card shows the feature name, "14 steps planned", "Not started", and both "Board" and "Docs" links. The board view shows all cards in the "Queued" column.

### 3: Error/Boundary -- Feature has malformed roadmap
Feature `broken-experiment` has a `roadmap.yaml` with invalid YAML. The feature card shows the feature name, a warning icon, and "Roadmap has errors" in muted text. "Board" link is present but leads to an error display showing the parse error message and file path. "Docs" link works normally.

## UAT Scenarios (BDD)

### Scenario 1: Feature view shows all discovered features
```gherkin
Scenario: Project feature view displays all features as cards
  Given Andres has navigated to "#/projects/nw-teams"
  And "nw-teams" has features "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
  When the feature view loads
  Then 4 feature cards are displayed
  And each card shows the feature name as its title
```

### Scenario 2: Feature with progress shows completion metrics
```gherkin
Scenario: Feature card shows delivery progress from execution-log
  Given feature "doc-viewer" in "nw-teams" has 14 total steps with 8 completed and 2 in progress
  When Andres views the feature list for "nw-teams"
  Then the "doc-viewer" card shows a progress bar at 57%
  And the card shows "8/14" completion text
  And the card shows "2 active" badge
```

### Scenario 3: Feature with roadmap shows Board link
```gherkin
Scenario: Feature with roadmap.yaml shows Board navigation link
  Given feature "doc-viewer" in "nw-teams" has a valid roadmap.yaml
  When Andres views the feature list
  Then the "doc-viewer" card shows both "Board" and "Docs" links
  And clicking "Board" navigates to "#/projects/nw-teams/features/doc-viewer/board"
```

### Scenario 4: Feature without roadmap shows Docs only
```gherkin
Scenario: Feature without roadmap shows only Docs link
  Given feature "discussion-notes" in "nw-teams" has documentation but no roadmap.yaml
  When Andres views the feature list
  Then the "discussion-notes" card shows "No roadmap yet" in muted text
  And only a "Docs" link is displayed
  And clicking "Docs" navigates to "#/projects/nw-teams/features/discussion-notes/docs"
```

### Scenario 5: Feature not started shows planned state
```gherkin
Scenario: Feature with roadmap but no execution-log shows planned state
  Given feature "multi-project-board" in "nw-teams" has roadmap.yaml with 14 steps
  And feature "multi-project-board" has no execution-log.yaml
  When Andres views the feature list
  Then the "multi-project-board" card shows "14 steps planned"
  And the progress bar shows 0%
  And both "Board" and "Docs" links are available
```

### Scenario 6: Breadcrumb shows project context
```gherkin
Scenario: Feature view breadcrumb enables navigation to overview
  Given Andres is viewing features for project "nw-teams" at "#/projects/nw-teams"
  Then the breadcrumb shows "Overview / nw-teams"
  When he clicks "Overview" in the breadcrumb
  Then the URL changes to "#/"
  And the project overview is displayed
```

## Acceptance Criteria
- [ ] Route `#/projects/{projectId}` renders a feature list view (not the old single-board view)
- [ ] Feature cards display: feature name, progress bar (if execution-log exists), "Board" link (if roadmap exists), "Docs" link
- [ ] Features without roadmap show "No roadmap yet" and only "Docs" link
- [ ] Features without execution-log but with roadmap show "N steps planned" and 0% progress
- [ ] Clicking "Board" navigates to `#/projects/{projectId}/features/{featureId}/board`
- [ ] Clicking "Docs" navigates to `#/projects/{projectId}/features/{featureId}/docs`
- [ ] Breadcrumb shows `Overview / {projectName}` with both segments clickable
- [ ] Empty feature list shows "No features found" guidance

## Technical Notes
- This story introduces new routes to the hash router. The existing `parseHash()` in `useRouter.ts` needs to handle `#/projects/{id}` as a new view type ("project" view) distinct from the current "board" view at `#/projects/{id}/board`.
- New Route type variants: `{ view: 'project'; projectId: string }` for the feature list, and `{ view: 'feature-board'; projectId: string; featureId: string }` and `{ view: 'feature-docs'; projectId: string; featureId: string }` for feature-level views.
- Feature data comes from the new API endpoint (`GET /api/projects/{projectId}/features`) defined in US-02.
- The existing `ProjectCard` component pattern can be adapted for `FeatureCard` -- similar layout but with Board/Docs action links instead of a single click target.
- Functional programming paradigm: Route parsing remains pure; feature card rendering is pure component.

## Dependencies
- US-01 (Project Manifest Registration) -- projects must be registered
- US-02 (Feature Discovery) -- feature list API must exist

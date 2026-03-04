# US-02: Feature Discovery Within Projects

## Problem
Andres has a project `nw-teams` with multiple features (`kanban-board`, `card-redesign`, `doc-viewer`, `multi-project-board`), each in its own directory under `docs/feature/`. The board app currently shows a single delivery state per project (from the project-root `state.yaml`), but his real work is organized by feature. He cannot see which features exist, which have active deliveries, and which are complete -- he has to browse the filesystem manually.

## Who
- Solo developer | Has projects with 1-5 features each, organized in `docs/feature/{feature-id}/` | Wants to see all features within a project with their delivery status

## Solution
A server-side feature discovery module that scans `docs/feature/` within each registered project's path. For each subdirectory found, it checks for `roadmap.yaml` (plan) and `execution-log.yaml` (state). The discovered features are exposed via a new API endpoint and displayed as feature cards in the project view.

## Job Story Trace
- JS-03: Navigate to a Feature Within a Project

## Domain Examples

### 1: Happy Path -- Andres views features for nw-teams
Andres clicks into the `nw-teams` project. The server scans `/Users/andres.dandrea/projects/personal/nw-teams/docs/feature/` and finds 4 subdirectories: `kanban-board`, `card-redesign`, `doc-viewer`, `multi-project-board`. It checks each for `roadmap.yaml` and `execution-log.yaml`. Three have both files (complete deliveries or in-progress). `multi-project-board` has a `roadmap.yaml` but no `execution-log.yaml` yet. The project view shows 4 feature cards with appropriate status.

### 2: Edge Case -- Feature directory has no roadmap or state files
Andres's `karateka` project has a feature directory `movement-system` that contains only `discuss/` documentation but no `roadmap.yaml` or `execution-log.yaml`. The feature card shows the name "movement-system" with a "Docs" link but no "Board" link and no progress metrics. The card displays "No roadmap yet" in muted text.

### 3: Error/Boundary -- docs/feature directory does not exist
Andres registers a new project `side-experiment` that has no `docs/feature/` directory at all. The project view shows an empty state: "No features found. Features are discovered from `docs/feature/` directories." No error -- this is a normal state for a project in early stages.

### 4: Edge Case -- Roadmap exists but is malformed
Feature `kanban-board` has a `roadmap.yaml` that contains invalid YAML syntax. The feature card shows the name, a "Docs" link, and a warning indicator. The "Board" link either leads to a parse error display, or the card pre-emptively indicates "Roadmap has errors."

## UAT Scenarios (BDD)

### Scenario 1: Features discovered from filesystem
```gherkin
Scenario: Server discovers features from docs/feature/ subdirectories
  Given project "nw-teams" is registered with path "/Users/andres.dandrea/projects/personal/nw-teams"
  And the path contains docs/feature/ with subdirectories "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
  When Andres requests the feature list for "nw-teams"
  Then the API returns 4 features
  And each feature has an id matching the directory name
```

### Scenario 2: Feature with roadmap reports board availability
```gherkin
Scenario: Feature with roadmap.yaml is marked as board-ready
  Given feature "doc-viewer" in project "nw-teams" has a valid roadmap.yaml
  When Andres requests the feature list for "nw-teams"
  Then the "doc-viewer" feature entry includes hasRoadmap: true
  And the feature entry includes summary metrics from execution-log.yaml
```

### Scenario 3: Feature without roadmap is docs-only
```gherkin
Scenario: Feature without roadmap is marked as docs-only
  Given feature "discussion-notes" in project "nw-teams" has no roadmap.yaml
  When Andres requests the feature list for "nw-teams"
  Then the "discussion-notes" feature entry includes hasRoadmap: false
  And no progress metrics are included for this feature
```

### Scenario 4: Project with no docs/feature directory shows empty
```gherkin
Scenario: Project without docs/feature directory returns empty feature list
  Given project "side-experiment" is registered
  And the project path has no docs/feature/ directory
  When Andres requests the feature list for "side-experiment"
  Then the API returns an empty feature list
  And no error is reported
```

### Scenario 5: Feature with execution progress reports metrics
```gherkin
Scenario: Feature with execution-log.yaml reports delivery metrics
  Given feature "doc-viewer" in project "nw-teams" has:
    | roadmap steps | completed | in_progress | failed |
    | 14            | 8         | 2           | 1      |
  When Andres requests the feature list for "nw-teams"
  Then the "doc-viewer" entry shows totalSteps: 14, completed: 8, inProgress: 2, failed: 1
```

## Acceptance Criteria
- [ ] Server scans `docs/feature/` within each registered project path for subdirectories
- [ ] Each subdirectory becomes a feature entry with ID derived from directory name
- [ ] Features with `roadmap.yaml` are marked as board-capable (`hasRoadmap: true`)
- [ ] Features with `execution-log.yaml` include delivery summary metrics (total, completed, in-progress, failed)
- [ ] Features without roadmap or execution-log have appropriate null/empty values (not errors)
- [ ] Projects without `docs/feature/` directory return empty feature list (no error)
- [ ] A new API endpoint exposes the feature list: `GET /api/projects/{projectId}/features`

## Technical Notes
- Feature discovery is a filesystem scan, similar in pattern to `scanProjectDirsFs()` in `discovery.ts`. It can reuse the same pure/adapter separation.
- Feature summary metrics reuse existing parsers (`parseStateYaml`, `parsePlanYaml` from `parser.ts`) -- the roadmap format is `ExecutionPlan` and execution-log format is `DeliveryState`.
- The feature list should be cached per project and refreshed periodically or on-demand (not on every API request).
- Feature IDs should be validated with the same `ProjectId` slug pattern (lowercase, hyphens) since they derive from directory names, which are typically already slugs.
- Functional programming paradigm: pure scan + filter + parse functions, with IO adapters for filesystem access.

## Dependencies
- US-01 (Project Manifest Registration) -- projects must be registered before features can be discovered

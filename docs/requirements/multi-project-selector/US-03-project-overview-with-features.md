# US-03: Project Overview with Feature Counts

## Problem
Andres opens the board app and sees project cards on the overview dashboard. Currently these cards show project-level delivery metrics from a single `state.yaml`. But his projects have multiple features, and the card does not tell him how many features exist or which ones have active deliveries. He has to click into each project to understand its structure, which is slow when checking on 3-5 projects quickly.

## Who
- Solo developer | Has 2-5 registered projects, each with 1-5 features | Wants to assess project health at a glance from the overview without clicking into each project

## Solution
Extend the project overview cards to show feature count and aggregated feature status. Each project card displays the number of discovered features and a brief status summary (e.g., "3 features active", "No active deliveries"). The card remains clickable, navigating to the project's feature list view.

## Job Story Trace
- JS-02: See All Projects at a Glance

## Domain Examples

### 1: Happy Path -- Andres checks the overview
Andres opens the board. He sees two project cards. The `nw-teams` card shows "Features: 4" with "3 active, 1 complete" beneath it. The `karateka` card shows "Features: 1" with "No active delivery". He immediately knows `nw-teams` is where the action is and clicks into it.

### 2: Edge Case -- Project with error state
The `old-project` was registered but its path no longer exists. The card shows the project name, an error indicator, and the message "Directory not found: /path/to/old-project". No feature count is shown because the directory cannot be scanned.

### 3: Error/Boundary -- Project registered but empty
Andres registered `side-experiment` which has a valid path but no `docs/feature/` directory. The card shows "side-experiment", the path, and "No features" in muted text. No error -- this is a valid state for a new project.

## UAT Scenarios (BDD)

### Scenario 1: Overview cards show feature counts
```gherkin
Scenario: Project cards display feature count from discovery
  Given projects "nw-teams" and "karateka" are registered
  And "nw-teams" has 4 features discovered
  And "karateka" has 1 feature discovered
  When Andres opens the board at "#/"
  Then the "nw-teams" card shows "Features: 4"
  And the "karateka" card shows "Features: 1"
```

### Scenario 2: Card shows aggregated feature status
```gherkin
Scenario: Project card summarizes feature delivery status
  Given project "nw-teams" has features:
    | feature         | completed | total | status       |
    | kanban-board    | 12        | 12    | complete     |
    | card-redesign   | 26        | 26    | complete     |
    | doc-viewer      | 8         | 14    | in progress  |
    | multi-project   | 0         | 0     | no roadmap   |
  When Andres views the overview
  Then the "nw-teams" card shows "1 in progress, 2 complete"
```

### Scenario 3: Error project shows diagnostic
```gherkin
Scenario: Project with invalid path shows error on overview
  Given project "old-project" is registered with path "/nonexistent/path"
  When Andres views the overview
  Then the "old-project" card shows an error indicator
  And the error message includes "Directory not found"
  And no feature count is displayed
```

### Scenario 4: Empty project shows graceful state
```gherkin
Scenario: Project with no features shows graceful message
  Given project "side-experiment" is registered with a valid path
  And the path has no docs/feature/ directory
  When Andres views the overview
  Then the "side-experiment" card shows "No features"
  And the card is still clickable
```

### Scenario 5: Card click navigates to project
```gherkin
Scenario: Clicking a project card navigates to project feature view
  Given Andres is on the overview at "#/"
  When he clicks the "nw-teams" project card
  Then the URL changes to "#/projects/nw-teams"
  And the feature list for "nw-teams" is displayed
```

## Acceptance Criteria
- [ ] Overview project cards show the count of discovered features
- [ ] Cards show an aggregated status summary (e.g., "N in progress, M complete")
- [ ] Projects with no features display "No features" in muted text
- [ ] Projects with directory errors show error indicator and diagnostic message
- [ ] Clicking a project card navigates to `#/projects/{projectId}` (feature list view)
- [ ] Card layout accommodates feature information without excessive height growth

## Technical Notes
- The existing `ProjectCard.tsx` component receives `ProjectSummary` type. This type needs extending with `featureCount` and optionally `featureSummary` fields.
- `deriveProjectSummary()` in `shared/types.ts` needs to accept feature discovery data as input.
- The overview WebSocket protocol (`project_list` message type) needs to include feature counts in `ProjectSummary`.
- Consider whether feature counts should be part of the WebSocket snapshot or fetched via HTTP -- for 2-5 projects with 1-5 features each, either approach works.

## Dependencies
- US-01 (Project Manifest Registration) -- projects must be registered
- US-02 (Feature Discovery) -- feature list must be available

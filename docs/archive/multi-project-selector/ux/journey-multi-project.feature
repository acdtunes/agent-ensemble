Feature: Multi-Project Selection and Navigation
  As a solo developer with projects at scattered filesystem paths,
  I want to register, browse, and drill into projects and their features,
  so I can monitor delivery progress across all my work from a single dashboard.

  Background:
    Given the board server is running

  # --- Step 1: Configure -- Add Projects from UI ---

  Scenario: User adds a project by selecting a folder
    Given the overview dashboard is showing with no projects
    When Andres clicks "Add Project"
    And selects the folder "/Users/andres.dandrea/projects/personal/karateka"
    Then the server validates the path exists
    And "karateka" appears as a project card on the overview
    And the project is persisted across server restarts

  Scenario: Adding an invalid path shows validation error
    Given Andres is on the overview dashboard
    When he attempts to add a project with path "/nonexistent/archive/old-project"
    Then a validation error is shown: "Directory not found"
    And no project is added to the registry

  Scenario: First launch shows empty state with add prompt
    Given no projects have been registered
    When Andres opens the board app
    Then the overview shows "No projects yet"
    And an "Add Project" button is prominently displayed

  Scenario: User removes a project from the board
    Given projects "karateka" and "nw-teams" are registered
    When Andres clicks the remove action on the "karateka" card
    And confirms the removal
    Then "karateka" is removed from the overview
    And the project files on disk are untouched
    And the removal persists across server restarts

  Scenario: Adding a duplicate project path is rejected
    Given project "karateka" is already registered
    When Andres attempts to add a project with the same path
    Then a message is shown: "This project is already registered"
    And no duplicate entry is created

  # --- Step 2: Orient -- Project Overview Dashboard ---

  Scenario: Overview shows all registered projects with feature counts
    Given projects "karateka" and "nw-teams" are registered
    And "nw-teams" has features "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
    And "karateka" has feature "movement-system"
    When Andres opens the board at "#/"
    Then the overview shows 2 project cards
    And the "nw-teams" card shows "Features: 4"
    And the "karateka" card shows "Features: 1"

  Scenario: Project with no docs/feature directory shows graceful state
    Given project "new-idea" is registered with no docs/feature/ directory
    When Andres views the overview
    Then the "new-idea" card shows "No features" in a muted style

  Scenario: Project with directory error shows error state
    Given project "phantom" has path "/nonexistent/path"
    When Andres views the overview
    Then the "phantom" card shows an error indicator
    And the error message includes the invalid path

  # --- Step 3: Select -- Enter a Project ---

  Scenario: Clicking a project card navigates to project feature view
    Given Andres is on the overview at "#/"
    When he clicks the "nw-teams" project card
    Then the URL changes to "#/projects/nw-teams"
    And the feature list for "nw-teams" is displayed

  Scenario: Project view shows all discovered features
    Given Andres has navigated to "#/projects/nw-teams"
    And "nw-teams" has features "kanban-board", "card-redesign", "doc-viewer", "multi-project-board"
    When the project view loads
    Then 4 feature cards are displayed
    And each card shows the feature name derived from directory name

  Scenario: Feature with roadmap shows Board and Docs links
    Given feature "doc-viewer" in "nw-teams" has a valid roadmap.yaml
    When Andres views the features for "nw-teams"
    Then the "doc-viewer" card shows both "Board" and "Docs" links

  Scenario: Feature without roadmap shows Docs link only
    Given feature "multi-project-board" in "nw-teams" has no roadmap.yaml
    When Andres views the features for "nw-teams"
    Then the "multi-project-board" card shows only a "Docs" link
    And no "Board" link is displayed for this feature

  Scenario: Feature with execution progress shows completion metrics
    Given feature "doc-viewer" in "nw-teams" has 14 steps with 8 completed
    When Andres views the features for "nw-teams"
    Then the "doc-viewer" card shows "8/14" and "57%" completion
    And "2 active" is shown when 2 steps are in progress

  # --- Step 4: Drill Down -- Feature Board or Docs (with selectors) ---

  Scenario: Feature board loads from feature-level artifacts
    Given Andres has selected feature "doc-viewer" in project "nw-teams"
    And "doc-viewer" has roadmap.yaml with 14 steps across 3 layers
    And execution-log.yaml shows 8 completed, 2 active, 1 failed
    When Andres clicks "Board" on the feature card
    Then the URL changes to "#/projects/nw-teams/features/doc-viewer/board"
    And the board shows cards organized by status columns
    And the progress header shows "8/14 (57%)" and "Phase 2 of 3"

  Scenario: Feature docs loads feature-scoped documentation
    Given Andres has selected feature "doc-viewer" in project "nw-teams"
    And "doc-viewer" has discuss/, design/, and distill/ subdirectories with documentation
    When Andres clicks "Docs" on the feature card
    Then the URL changes to "#/projects/nw-teams/features/doc-viewer/docs"
    And the doc tree shows documentation from docs/feature/doc-viewer/

  Scenario: Switch feature via dropdown in board view
    Given Andres is viewing the board for "doc-viewer" in "nw-teams"
    And the header shows a feature dropdown with "doc-viewer" selected
    When he selects "card-redesign" from the feature dropdown
    Then the URL changes to "#/projects/nw-teams/features/card-redesign/board"
    And the board reloads with "card-redesign" delivery data

  Scenario: Switch feature via dropdown in docs view
    Given Andres is viewing docs for "doc-viewer" in "nw-teams"
    And the header shows a feature dropdown with "doc-viewer" selected
    When he selects "card-redesign" from the feature dropdown
    Then the URL changes to "#/projects/nw-teams/features/card-redesign/docs"
    And the doc viewer reloads with "card-redesign" documentation

  Scenario: Switch project via dropdown navigates to feature list
    Given Andres is viewing the board for "doc-viewer" in "nw-teams"
    And the header shows a project dropdown with "nw-teams" selected
    When he selects "karateka" from the project dropdown
    Then the URL changes to "#/projects/karateka"
    And the feature list for "karateka" is displayed

  Scenario: Board feature dropdown only shows board-capable features
    Given project "nw-teams" has features "doc-viewer" (has roadmap) and "notes" (no roadmap)
    When Andres opens the feature dropdown in the board view
    Then "doc-viewer" is listed
    And "notes" is not listed

  Scenario: Docs feature dropdown shows all features
    Given project "nw-teams" has features "doc-viewer" (has roadmap) and "notes" (no roadmap)
    When Andres opens the feature dropdown in the docs view
    Then both "doc-viewer" and "notes" are listed

  Scenario: Breadcrumb enables navigation up the hierarchy
    Given Andres is viewing the board for feature "doc-viewer" in project "nw-teams"
    And the breadcrumb shows "Overview / nw-teams / doc-viewer"
    When he clicks "nw-teams" in the breadcrumb
    Then the URL changes to "#/projects/nw-teams"
    And the feature list is displayed

  Scenario: Breadcrumb back to overview
    Given Andres is viewing the feature list for project "nw-teams"
    And the breadcrumb shows "Overview / nw-teams"
    When he clicks "Overview" in the breadcrumb
    Then the URL changes to "#/"
    And the project overview is displayed

  # --- Error Paths ---

  Scenario: Feature board with parse error shows diagnostic
    Given feature "broken-feature" in "nw-teams" has a malformed roadmap.yaml
    When Andres clicks "Board" on the "broken-feature" card
    Then an inline error is shown with the parse error message
    And the file path to roadmap.yaml is displayed for debugging

  Scenario: Feature directory removed after discovery
    Given Andres is viewing features for "nw-teams"
    And the "doc-viewer" feature directory is deleted from the filesystem
    When the feature list refreshes
    Then the "doc-viewer" card is removed from the view
    Or the card shows an error state indicating the directory was not found

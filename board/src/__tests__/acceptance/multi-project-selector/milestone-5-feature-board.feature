Feature: Feature-Level Board View
  As Andres, a solo developer,
  I want to view a delivery board scoped to a single feature
  and switch between features and projects without navigating back,
  so I can monitor feature-level delivery progress efficiently.

  # ================================================================
  # US-05: Feature-Level Board View (8 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-05
  Scenario: Feature board loads delivery data from feature-level artifacts
    Given project "nw-teams" is registered
    And feature "card-redesign" has a roadmap with 7 steps across 3 layers
    And feature "card-redesign" has execution state with 3 completed and 2 in progress
    When Andres navigates to the board for feature "card-redesign" in project "nw-teams"
    Then the board shows 3 steps in the completed column
    And the board shows 2 steps in the in-progress column
    And the remaining steps appear in the queued column

  @US-05 @skip
  Scenario: Feature without execution state shows all steps as queued
    Given project "nw-teams" is registered
    And feature "multi-project-selector" has a roadmap with 10 steps
    And feature "multi-project-selector" has no execution log
    When Andres navigates to the board for feature "multi-project-selector"
    Then all 10 steps appear in the queued column
    And the progress header shows "0 / 10" steps completed

  @US-05 @skip
  Scenario: Board breadcrumb shows full navigation hierarchy
    Given Andres is viewing the board for feature "card-redesign" in project "nw-teams"
    Then the breadcrumb shows "Overview / nw-teams / card-redesign"
    And clicking "nw-teams" navigates to the feature list for "nw-teams"
    And clicking "Overview" navigates to the project overview

  @US-05 @skip
  Scenario: Board-to-Docs tab switching within a feature
    Given Andres is viewing the board for feature "doc-viewer" in project "nw-teams"
    When he clicks the "Docs" tab
    Then the view switches to the docs view for feature "doc-viewer" in project "nw-teams"
    And the feature and project context are preserved

  # --- Context Switching ---

  @US-05 @skip
  Scenario: Switch feature from board view via dropdown
    Given Andres is viewing the board for feature "card-redesign" in project "nw-teams"
    And project "nw-teams" has board-capable features "card-redesign" and "doc-viewer"
    When he selects "doc-viewer" from the feature dropdown
    Then the board updates to show delivery data for feature "doc-viewer"
    And the breadcrumb updates to "Overview / nw-teams / doc-viewer"

  @US-05 @skip
  Scenario: Switch project from board view via dropdown
    Given Andres is viewing the board for feature "card-redesign" in project "nw-teams"
    And project "karateka" is also registered
    When he selects "karateka" from the project dropdown
    Then the view navigates to the feature list for "karateka"

  @US-05 @skip
  Scenario: Feature dropdown only shows board-capable features
    Given project "nw-teams" has features "card-redesign" (with roadmap) and "kanban-board" (docs only)
    When Andres views the feature dropdown on the board view
    Then the dropdown lists only "card-redesign"
    And "kanban-board" is not available in the board feature dropdown

  # --- Error Path ---

  @US-05 @skip
  Scenario: Roadmap parse error shows diagnostic instead of board
    Given project "nw-teams" is registered
    And feature "broken-feature" has a malformed roadmap
    When Andres navigates to the board for feature "broken-feature"
    Then a diagnostic message describes the roadmap parsing error
    And the board columns are not displayed

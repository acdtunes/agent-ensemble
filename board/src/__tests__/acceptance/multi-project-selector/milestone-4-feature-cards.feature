Feature: Project Overview and Feature Cards
  As Andres, a solo developer,
  I want project cards with feature counts and a feature grid view per project,
  so I can quickly assess project health and drill into individual features.

  # ================================================================
  # US-03: Project Overview with Feature Counts (5 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-03
  Scenario: Project card shows feature count on overview
    Given project "nw-teams" has 4 features: 2 with active deliveries and 2 docs-only
    When Andres views the overview dashboard
    Then the card for "nw-teams" shows "4 features"
    And the card shows aggregated delivery progress across all features

  @US-03 @skip
  Scenario: Project card shows aggregated feature status
    Given project "nw-teams" has features with total 12 steps: 5 completed, 3 in progress, 1 failed
    When Andres views the overview dashboard
    Then the card for "nw-teams" shows "5 completed" in the status summary
    And the card shows "3 in progress" and "1 failed"

  # --- Error Path ---

  @US-03 @skip
  Scenario: Project with parse error shows diagnostic on card
    Given project "broken-project" has a configuration error
    When Andres views the overview dashboard
    Then the card for "broken-project" shows an error indicator
    And the error describes the configuration problem

  # --- Empty / Edge ---

  @US-03 @skip
  Scenario: Project with no features shows graceful empty state
    Given project "empty-project" has 0 features discovered
    When Andres views the overview dashboard
    Then the card for "empty-project" shows "No features"
    And the card provides guidance on creating features

  @US-03 @skip
  Scenario: Clicking a project card navigates to the feature view
    Given project "nw-teams" is displayed on the overview
    When Andres clicks on the "nw-teams" project card
    Then the view navigates to the feature list for "nw-teams"

  # ================================================================
  # US-04: Project Feature View (6 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-04 @skip
  Scenario: Feature view shows all discovered features for a project
    Given project "nw-teams" has features "card-redesign", "doc-viewer", "kanban-board"
    When Andres views the feature list for project "nw-teams"
    Then 3 feature cards are displayed
    And each card shows the feature name

  @US-04 @skip
  Scenario: Feature card with delivery progress shows completion metrics
    Given feature "card-redesign" has 7 total steps with 3 completed and 2 in progress
    When Andres views the feature card for "card-redesign"
    Then the card shows a progress indicator at 3 of 7
    And the card shows "2 in progress"

  @US-04 @skip
  Scenario: Feature with roadmap shows Board action link
    Given feature "card-redesign" has a roadmap
    When Andres views the feature card for "card-redesign"
    Then the card shows a "Board" link to the feature board view

  @US-04 @skip
  Scenario: Feature without roadmap shows Docs-only indicator
    Given feature "kanban-board" has documentation but no roadmap
    When Andres views the feature card for "kanban-board"
    Then the card shows "Docs only" instead of a Board link
    And the card shows a "Docs" link to the feature docs view

  @US-04 @skip
  Scenario: Feature not yet started shows planned state
    Given feature "multi-project-selector" has a roadmap with 10 steps but no execution log
    When Andres views the feature card for "multi-project-selector"
    Then the card shows "Planned" status
    And the progress shows 0 of 10 steps completed

  @US-04 @skip
  Scenario: Feature view breadcrumb shows project context
    Given Andres is viewing the feature list for project "nw-teams"
    Then the breadcrumb shows "Overview / nw-teams"
    And clicking "Overview" navigates back to the project overview

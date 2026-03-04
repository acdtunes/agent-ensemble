Feature: Step Detail Modal
  As Andres, a project owner who spots a card of interest on the board,
  I want to click the card and see a read-only modal with full step context
  including description, files, conflicts, teammate, status, and timing,
  so I can understand the complete picture without leaving the board or reading YAML files.

  # ================================================================
  # US-02: Step Detail Modal (7 scenarios)
  # ================================================================

  @US-02 @skip
  Scenario: Clicking a card opens modal with step description
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" has description "Create REST API route handlers for authentication endpoints."
    And step "01-02" modifies file "src/routes.ts"
    When Andres clicks the card for "src/routes.ts"
    Then a modal dialog opens
    And the modal title shows "Setup API routes"
    And the modal shows step ID "01-02" in monospace
    And the modal shows the description "Create REST API route handlers for authentication endpoints."

  @US-02 @skip
  Scenario: Modal displays file list and conflict information
    Given step "01-02 Setup API routes" modifies files "src/routes.ts" and "src/schema.ts"
    And step "01-02" conflicts with step "01-01 Setup database"
    When Andres opens the detail modal for step "01-02"
    Then the modal lists files "src/routes.ts" and "src/schema.ts"
    And the conflicts section shows "Setup database" as a conflicting step

  @US-02 @skip
  Scenario: Modal shows timing and review attempts for completed step
    Given step "01-01 Setup database" is approved
    And step "01-01" started at "2026-01-01T00:10:00Z" and completed at "2026-01-01T00:30:00Z"
    And step "01-01" had 2 review attempts
    When Andres opens the detail modal for step "01-01"
    Then the modal shows status "Done"
    And the modal shows started and completed times
    And the modal shows a computed duration
    And the modal shows "2" review attempts

  @US-02 @skip
  Scenario: Modal omits description section when plan has no description
    Given step "02-01 Integration tests" has no description in the plan
    And step "02-01" modifies file "tests/integration.ts"
    When Andres opens the detail modal for step "02-01"
    Then the modal does not display a description section
    And the modal does not show an empty description placeholder

  @US-02 @skip
  Scenario: Modal closes via close button, outside click, and Escape key
    Given Andres has opened a detail modal for step "01-02"
    When Andres clicks the close button
    Then the modal closes and the board is visible

    Given Andres has opened a detail modal for step "01-02"
    When Andres clicks outside the modal content area
    Then the modal closes

    Given Andres has opened a detail modal for step "01-02"
    When Andres presses the Escape key
    Then the modal closes

  @US-02 @skip
  Scenario: Modal shows minimal data for pending step with no teammate
    Given step "02-01 Integration tests" is pending with no teammate
    And step "02-01" modifies file "tests/integration.ts"
    When Andres opens the detail modal for step "02-01"
    Then the modal shows status "Pending"
    And the modal does not show a teammate section
    And the modal does not show started or completed times

  @US-02 @skip
  Scenario: Modal is read-only with no mutation controls
    Given Andres has opened a detail modal for step "01-02"
    Then the modal contains only read-only text and a close action
    And there are no edit buttons, input fields, or form controls

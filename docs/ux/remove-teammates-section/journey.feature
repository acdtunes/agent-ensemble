Feature: Remove Teammates Section from Board
  As a project owner monitoring multi-agent delivery
  I want the board to show only actionable step information
  So I can quickly assess progress without filtering out noise

  Background:
    Given a roadmap with multiple phases and steps
    And some steps are assigned to AI agents

  @US-01
  Scenario: Board displays full-width without sidebar
    When I open the board view
    Then the Kanban board should use full available width
    And there should be no Teammates sidebar section

  @US-02
  Scenario: Cards do not show agent assignment
    Given a step "Setup API routes" is assigned to agent "crafter-01"
    And the step status is "in_progress"
    When I view the board
    Then the card for "Setup API routes" should be visible
    And the card should not display agent identifier "crafter-01"
    And the card should not display any teammate emoji

  @US-03
  Scenario: Modal does not show agent assignment
    Given a step "Setup API routes" is assigned to agent "crafter-01"
    When I click on the card for "Setup API routes"
    Then the step detail modal should open
    And the modal header should not display agent identifier "crafter-01"
    And the modal should display the step name "Setup API routes"
    And the modal should display the step status

  @US-01
  Scenario: Done cards remain unchanged
    Given a step "Init DB schema" has status "approved"
    When I view the board
    Then the card should appear in the Done column
    And the card should not display any agent indicator
    # Note: Done cards already hide agent per existing behavior

  @US-02
  Scenario: Step details still show review history
    Given a step with 2 review cycles
    When I open the step detail modal
    Then the Review History section should be visible
    And it should show both review entries
    # Agent removal does not affect review history display

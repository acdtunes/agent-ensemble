Feature: Plan Description Schema and Phase Indicator
  As Andres, a project owner,
  I want step descriptions available in the plan schema
  and a contextual phase indicator in the progress header,
  so I can understand step intent and delivery progress without ambiguity.

  # ================================================================
  # US-03: Step Description in Plan Schema (3 scenarios)
  # ================================================================

  @US-03
  Scenario: Plan step with description is parsed correctly
    Given a delivery plan containing step "01-02" with description "Create REST API route handlers for authentication endpoints."
    When the plan is loaded
    Then step "01-02" includes description "Create REST API route handlers for authentication endpoints."

  @US-03 @skip
  Scenario: Plan step without description is parsed without error
    Given a delivery plan containing step "02-01" without a description field
    When the plan is loaded
    Then step "02-01" has no description
    And no error occurs during loading

  @US-03 @skip @property
  Scenario: Plan with mixed description presence is handled correctly
    Given a delivery plan where step "01-01" has description "Initialize database schema." and step "02-01" has no description
    When the plan is loaded
    Then step "01-01" includes description "Initialize database schema."
    And step "02-01" has no description
    And no error occurs during loading

  # ================================================================
  # US-04: Contextual Phase Indicator
  # Consolidated into walking-skeleton.feature scenarios:
  #   - "Andres checks delivery progress and sees the current phase"
  #   - "Andres understands delivery progress"
  # ================================================================

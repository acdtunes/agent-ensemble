Feature: Plan Description Schema and Phase Indicator
  As Andres, a project owner,
  I want step descriptions available in the plan schema
  and a contextual phase indicator in the progress header,
  so I can understand step intent and delivery progress without ambiguity.

  # ================================================================
  # US-03: Step Description in Plan Schema (3 scenarios)
  # Board-side: parse and display descriptions in plan.yaml
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
  # US-03b: Plan Generator Description Passthrough (3 scenarios)
  # Generator-side: propagate descriptions from roadmap.yaml to plan.yaml
  # ================================================================

  @US-03b @skip
  Scenario: Plan generator carries description from roadmap to plan
    Given a roadmap where step "01-01" has description "Initialize database schema with user and session tables."
    When the execution plan is generated
    Then the plan step "01-01" includes description "Initialize database schema with user and session tables."

  @US-03b @skip
  Scenario: Plan generator handles roadmap step without description
    Given a roadmap where step "02-01" has no description field
    When the execution plan is generated
    Then the plan step "02-01" has no description field
    And no error occurs during generation

  @US-03b @skip
  Scenario: Plan generator preserves descriptions across mixed roadmap
    Given a roadmap where step "01-01" has description "Initialize database schema." and step "02-01" has no description
    When the execution plan is generated
    Then the plan step "01-01" includes description "Initialize database schema."
    And the plan step "02-01" has no description field

  # ================================================================
  # US-04: Contextual Phase Indicator (5 scenarios)
  # ================================================================

  @US-04 @skip
  Scenario: Progress header shows phase during active multi-layer delivery
    Given a delivery with 3 layers and 7 total steps
    And 3 of 7 steps are completed
    And the delivery is currently on layer 2
    When Andres views the progress header
    Then the phase indicator shows "Phase 2 of 3"

  @US-04 @skip
  Scenario: Progress header shows Complete when all steps are done
    Given a delivery with 3 layers and 7 total steps
    And 7 of 7 steps are completed
    When Andres views the progress header
    Then the phase indicator shows "Complete"

  @US-04 @skip
  Scenario: Progress header shows Phase 1 at delivery start
    Given a delivery with 3 layers and 7 total steps
    And 0 of 7 steps are completed
    And the delivery is currently on layer 1
    When Andres views the progress header
    Then the phase indicator shows "Phase 1 of 3"

  @US-04 @skip
  Scenario: Single-layer delivery shows Phase 1 of 1
    Given a delivery with 1 layer and 3 total steps
    And 0 of 3 steps are completed
    And the delivery is currently on layer 1
    When Andres views the progress header
    Then the phase indicator shows "Phase 1 of 1"

  @US-04 @skip
  Scenario: Single-layer delivery shows Complete when all done
    Given a delivery with 1 layer and 3 total steps
    And 3 of 3 steps are completed
    When Andres views the progress header
    Then the phase indicator shows "Complete"

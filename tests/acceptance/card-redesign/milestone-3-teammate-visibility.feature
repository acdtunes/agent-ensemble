Feature: Teammate Visibility on Cards
  As Andres, a project owner monitoring a multi-agent delivery,
  I want to see which teammate is working on each card
  with a person icon and color-coded label,
  so I can track workload distribution at a glance without cross-referencing the sidebar.

  # ================================================================
  # US-05: Teammate Visibility on Cards (6 scenarios)
  # ================================================================

  @US-05 @skip
  Scenario: Active card shows teammate with colored label
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" is assigned to teammate "crafter-02"
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the card for "src/routes.ts"
    Then the card shows a person icon and the label "crafter-02"
    And the "crafter-02" label uses a distinctive text color

  @US-05 @skip
  Scenario: Same teammate has same color across all their cards
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" is assigned to teammate "crafter-02"
    And step "01-02" modifies files "src/routes.ts" and "src/schema.ts"
    When Andres views both cards for step "01-02"
    Then both cards show "crafter-02" with the same text color

  @US-05 @skip
  Scenario: Different teammates display different label colors
    Given step "01-01 Setup database" is in progress and assigned to "crafter-01"
    And step "01-02 Setup API routes" is in progress and assigned to "crafter-02"
    When Andres views cards from both steps
    Then the "crafter-01" label color differs from the "crafter-02" label color

  @US-05 @skip
  Scenario: Pending card shows no teammate indicator
    Given step "02-01 Integration tests" is pending with no assigned teammate
    And step "02-01" modifies file "tests/integration.ts"
    When Andres views the card for "tests/integration.ts"
    Then the card does not display a person icon or teammate label
    And there is no "unassigned" placeholder text

  @US-05 @skip
  Scenario: Completed card retains teammate attribution
    Given step "01-01 Setup database" is approved
    And step "01-01" was assigned to teammate "crafter-01"
    And step "01-01" modifies file "src/db.ts"
    When Andres views the card for "src/db.ts" in the Done column
    Then the card shows "crafter-01" with a person icon and colored label

  @US-05 @skip @property
  Scenario: Teammate color is deterministic across page reloads
    Given step "01-02" is assigned to teammate "crafter-02"
    When the teammate color is computed for "crafter-02" on two separate occasions
    Then the color produced is identical both times

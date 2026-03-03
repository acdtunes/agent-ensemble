Feature: Teammate Visibility on Cards
  As Andres, a project owner monitoring a multi-agent delivery,
  I want to see which teammate is working on each card
  with a person icon and color-coded label,
  so I can track workload distribution at a glance without cross-referencing the sidebar.

  # ================================================================
  # US-05: Teammate Visibility on Cards (2 scenarios)
  # Remaining scenarios after consolidation
  # ================================================================

  @US-05
  Scenario: Active card shows teammate with colored label
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" is assigned to teammate "crafter-02"
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the card for "src/routes.ts"
    Then the card shows a person icon and the label "crafter-02"
    And the "crafter-02" label uses a distinctive text color

  @US-05
  Scenario: Different teammates display different label colors
    Given step "01-01 Setup database" is in progress and assigned to "crafter-01"
    And step "01-02 Setup API routes" is in progress and assigned to "crafter-02"
    When Andres views cards from both steps
    Then the "crafter-01" label color differs from the "crafter-02" label color

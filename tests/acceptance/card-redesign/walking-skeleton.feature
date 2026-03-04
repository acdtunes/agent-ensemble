Feature: Card Redesign Walking Skeletons
  As Andres, a project owner overseeing multi-agent delivery,
  I want redesigned kanban cards with clear task identity, teammate visibility,
  and on-demand detail access,
  so I can monitor delivery progress confidently without mental translation.

  # Walking skeletons prove observable user value end-to-end.
  # Each answers: "Can Andres accomplish this goal and see the result?"

  @walking_skeleton
  Scenario: Andres identifies a task at a glance and sees who is working on it
    Given a delivery with step "01-02 Setup API routes" in progress
    And step "01-02" is assigned to teammate "crafter-02"
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the board
    Then the card shows "Setup API routes" as the primary title
    And the card shows "src/routes.ts" as a muted subtitle
    And the card shows step ID "01-02" in the top-right corner
    And the card shows teammate "crafter-02" with a colored label

  @walking_skeleton
  Scenario: Andres clicks a card and reads the full step context
    Given a delivery with step "01-02 Setup API routes" in progress
    And step "01-02" has description "Create REST API route handlers for authentication."
    And step "01-02" is assigned to teammate "crafter-02"
    And step "01-02" modifies files "src/routes.ts" and "src/schema.ts"
    And step "01-02" conflicts with step "01-01 Setup database"
    When Andres clicks the card for "src/routes.ts"
    Then a detail modal opens showing title "Setup API routes"
    And the modal shows the description "Create REST API route handlers for authentication."
    And the modal lists files "src/routes.ts" and "src/schema.ts"
    And the modal shows the conflict with "Setup database"
    And the modal shows teammate "crafter-02"
    And Andres can close the modal and return to the board

  @walking_skeleton
  Scenario: Andres checks delivery progress and sees the current phase
    Given a delivery with 3 layers and 7 total steps
    And 3 of 7 steps are completed
    And the delivery is currently on layer 2
    When Andres views the progress header
    Then the phase indicator shows "Phase 2 of 3"
    And the progress shows "3 / 7" steps completed

Feature: Readable Card Identity
  As Andres, a project owner monitoring multi-agent delivery,
  I want cards to show the step name as the primary title
  with the filename as a muted subtitle and step ID in the top-right corner,
  so I can identify tasks at a glance without mentally translating filenames.

  # ================================================================
  # US-01: Readable Card Identity (5 scenarios)
  # ================================================================

  @US-01 @skip
  Scenario: Card displays step name as primary title
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the board
    Then the card for "src/routes.ts" shows "Setup API routes" as the primary title
    And the primary title uses prominent styling

  @US-01 @skip
  Scenario: Card displays filename as muted subtitle
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the board
    Then the card for "src/routes.ts" shows "src/routes.ts" as a subtitle below the title
    And the subtitle uses smaller, muted text styling

  @US-01 @skip
  Scenario: Step ID appears in top-right corner with monospace styling
    Given step "01-02 Setup API routes" is in progress
    And step "01-02" modifies file "src/routes.ts"
    When Andres views the card for "src/routes.ts"
    Then the step ID "01-02" appears in the top-right area of the card
    And the step ID uses a monospace font

  @US-01 @skip
  Scenario: Multiple cards from same step share title and step ID
    Given step "01-01 Setup database" is approved
    And step "01-01" modifies files "src/db.ts" and "src/schema.ts"
    When Andres views the Done column
    Then both cards show "Setup database" as the primary title
    And both cards show "01-01" in the top-right corner
    And the cards are distinguishable by subtitles "src/db.ts" and "src/schema.ts"

  @US-01 @skip
  Scenario: Conflict detection through filename subtitles across steps
    Given step "01-01 Setup database" is approved with file "src/schema.ts"
    And step "01-02 Setup API routes" is in progress with file "src/schema.ts"
    When Andres scans the board
    Then a card with subtitle "src/schema.ts" appears in the Done column with title "Setup database"
    And a card with subtitle "src/schema.ts" appears in the In Progress column with title "Setup API routes"

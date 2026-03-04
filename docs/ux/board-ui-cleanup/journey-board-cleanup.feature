Feature: Board UI Cleanup
  As Andres, a project owner monitoring multi-agent delivery,
  I want the board to show only actionable information
  so I can focus on team status and work progress without parsing noise.

  # ================================================================
  # US-01: Remove Activity Section (3 scenarios)
  # Job: Declutter the Board Sidebar
  # ================================================================

  @US-01
  Scenario: Board sidebar does not show activity feed
    Given Andres opens the board for project "nw-teams" feature "directory-browser"
    And the roadmap has 3 steps with 2 transitions recorded
    When the board finishes loading
    Then the sidebar does not contain an "Activity" section
    And the sidebar shows only the "Teammates" section

  @US-01
  Scenario: Sidebar reclaims vertical space from removed activity section
    Given Andres opens the board for project "nw-teams" feature "directory-browser"
    And the roadmap has 5 active teammates and 10 transitions
    When the board finishes loading
    Then the Teammates panel is visible without scrolling in the sidebar

  @US-01
  Scenario: Transition data remains available via WebSocket
    Given Andres has the board open for project "nw-teams"
    And step "01-03" transitions from "in_progress" to "review"
    When the WebSocket delivers the update
    Then the board reflects the updated step status on the kanban card
    And no activity feed entry is rendered

  # ================================================================
  # US-02: Active-Only Teammates Panel (5 scenarios)
  # Job: See Only Active Teammates
  # ================================================================

  @US-02
  Scenario: Panel shows only teammates with active steps
    Given the roadmap for "nw-teams" feature "board-ui-redesign" has:
      | step_id | step_name        | status      | teammate_id |
      | 01-01   | Setup database   | approved    | crafter-01  |
      | 01-02   | Build API routes | in_progress | crafter-02  |
      | 02-01   | Write tests      | pending     | null        |
    When Andres views the Teammates panel
    Then the panel shows "crafter-02" with current step "Build API routes"
    And the panel does not show "crafter-01"

  @US-02
  Scenario: Active teammate shows completed count alongside current task
    Given crafter-03 has completed 4 steps and is currently working on "Integration tests"
    When Andres views the Teammates panel
    Then the panel shows "crafter-03" with current step "Integration tests"
    And the panel shows "4 completed" for crafter-03

  @US-02
  Scenario: Teammate in review status counts as active
    Given crafter-01 has one step "Setup auth" in "review" status
    And crafter-01 has 2 previously completed steps
    When Andres views the Teammates panel
    Then the panel shows "crafter-01" with current step "Setup auth"

  @US-02
  Scenario: Empty state when no teammates are active
    Given all steps in the roadmap are either "approved", "pending", or "failed"
    And no step has a teammate in "claimed", "in_progress", or "review" status
    When Andres views the Teammates panel
    Then the panel shows "No active teammates"

  @US-02
  Scenario: Teammate with claimed status counts as active
    Given crafter-04 has claimed step "Database migration" but has not started it
    When Andres views the Teammates panel
    Then the panel shows "crafter-04" with current step "Database migration"

  # ================================================================
  # US-03: Clean Done Card Appearance (4 scenarios)
  # Job: Clean Up Done Cards
  # ================================================================

  @US-03
  Scenario: Done card with unassigned teammate shows no teammate indicator
    Given step "01-01 Setup database" is approved
    And step "01-01" has teammate_id null (unassigned after completion)
    When Andres views the card in the Done column
    Then the card shows step name "Setup database" and ID "01-01"
    And the card does not display a teammate indicator

  @US-03
  Scenario: Done card with still-assigned teammate shows teammate indicator
    Given step "01-02 Build API routes" is approved
    And step "01-02" has teammate_id "crafter-01" (still assigned)
    When Andres views the card in the Done column
    Then the card shows the teammate indicator for "crafter-01"

  @US-03
  Scenario: Active card always shows teammate indicator
    Given step "02-01 Write tests" is in_progress
    And step "02-01" is assigned to teammate "crafter-02"
    When Andres views the card in the In Progress column
    Then the card displays the teammate indicator for "crafter-02"

  @US-03
  Scenario: Step detail modal still shows teammate for done steps
    Given step "01-01 Setup database" is approved with teammate_id null
    And the card in the Done column shows no teammate indicator
    When Andres clicks the card to open the step detail modal
    Then the modal does not show a teammate section (teammate_id is null)

  # ================================================================
  # US-04: Remove Review Badge from Cards (3 scenarios)
  # Job: Replace Review Badge with Review History (Part 1: Card Cleanup)
  # ================================================================

  @US-04
  Scenario: Card does not show review count badge
    Given step "01-02 Build API routes" has 2 review attempts
    And step "01-02" is in "in_progress" status
    When Andres views the card on the board
    Then the card does not display a review count badge
    And the card still shows the worktree badge if applicable
    And the card still shows the blocked badge if applicable

  @US-04
  Scenario: Step detail modal still shows review attempts in timing
    Given step "01-02 Build API routes" has 2 review attempts
    And step "01-02" started at "2026-03-01T09:00:00Z"
    When Andres opens the step detail modal for "01-02"
    Then the modal timing section shows "2 review attempts"

  @US-04
  Scenario: Card with zero review attempts is unchanged
    Given step "02-01 Write tests" has 0 review attempts
    When Andres views the card on the board
    Then the card displays step name, ID, file count, and teammate
    And no review badge area is visible

  # ================================================================
  # US-05: Review History in Step Detail Modal (5 scenarios)
  # Job: Replace Review Badge with Review History (Part 2: Modal Enhancement)
  # DEPENDENCY: Requires review feedback data structure in RoadmapStep
  # ================================================================

  @US-05
  Scenario: Modal shows review history with feedback
    Given step "01-02 Build API routes" has the following review history:
      | cycle | timestamp               | outcome  | feedback                                        |
      | 1     | 2026-03-01T10:15:00Z    | rejected | Missing error handling for expired tokens.       |
      | 2     | 2026-03-02T15:30:00Z    | approved | All issues addressed. Ready to merge.            |
    When Andres opens the step detail modal for "01-02"
    Then the modal shows a "Review History" section
    And review #2 (approved, "All issues addressed") appears first
    And review #1 (rejected, "Missing error handling") appears second

  @US-05
  Scenario: Modal falls back to count when no feedback data exists
    Given step "01-03 Setup middleware" has review_attempts 3
    And step "01-03" has no review_history data (legacy format)
    When Andres opens the step detail modal for "01-03"
    Then the modal shows "3 review attempts" in the timing section
    And no "Review History" section is displayed

  @US-05
  Scenario: Modal shows single review entry
    Given step "02-01 Write tests" has one review:
      | cycle | timestamp               | outcome  | feedback                       |
      | 1     | 2026-03-03T09:00:00Z    | approved | Tests cover all edge cases.    |
    When Andres opens the step detail modal for "02-01"
    Then the modal shows a "Review History" section with one entry
    And the entry shows "Review #1" with outcome "approved"

  @US-05
  Scenario: Review history not shown for steps with zero reviews
    Given step "03-01 Deploy" has review_attempts 0 and no review_history
    When Andres opens the step detail modal for "03-01"
    Then the modal does not show a "Review History" section
    And the modal does not show review attempts in timing

  @US-05
  Scenario: Review feedback preserves multi-line content
    Given step "01-02" has a review with feedback containing multiple lines:
      """
      Missing error handling for expired tokens.
      The auth middleware does not validate token expiry.
      Also: SQL injection risk in user lookup query.
      """
    When Andres opens the step detail modal for "01-02"
    Then the review feedback displays with preserved line breaks

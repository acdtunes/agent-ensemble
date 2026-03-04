Feature: Conflict Detection for Kanban Cards
  As a team lead
  I want to see which kanban cards will conflict due to shared files
  So that I can plan worktree usage and avoid merge chaos

  Background:
    Given a roadmap with multiple steps
    And some steps share files in their files_to_modify arrays

  # --- DISCOVER PHASE ---

  Scenario: Card shows conflict count badge when files overlap
    Given step "1.1" modifies files ["src/auth.ts", "src/utils.ts"]
    And step "2.1" modifies files ["src/auth.ts", "src/api.ts"]
    And both steps are in status "pending"
    When I view the kanban board
    Then step "1.1" should display a badge "conflicts: 1"
    And step "2.1" should display a badge "conflicts: 1"

  Scenario: Card shows worktree recommendation when conflicting with in-progress work
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    And step "1.1" is in status "in_progress"
    And step "2.1" is in status "pending"
    When I view the kanban board
    Then step "2.1" should display a badge "needs worktree"

  Scenario: No conflict badge shown when card has no file overlaps
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/api.ts"]
    When I view the kanban board
    Then step "1.1" should not display a conflict badge
    And step "2.1" should not display a conflict badge

  Scenario: Conflict badge hidden when all conflicting cards are done
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    And step "1.1" is in status "approved"
    And step "2.1" is in status "approved"
    When I view the kanban board
    Then step "1.1" should not display a conflict badge
    And step "2.1" should not display a conflict badge

  # --- INVESTIGATE PHASE ---

  Scenario: Hovering card shows conflicting step IDs
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    And step "3.1" modifies files ["src/auth.ts"]
    When I hover over step "1.1"
    Then I should see "Conflicts with: 2.1, 3.1"

  Scenario: Clicking card highlights conflicting cards on board
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    When I click on step "1.1"
    Then step "2.1" should be highlighted
    And step "1.1" should show its conflicts panel

  Scenario: Conflict details show shared files
    Given step "1.1" modifies files ["src/auth.ts", "src/utils.ts"]
    And step "2.1" modifies files ["src/auth.ts", "src/api.ts"]
    When I view conflict details for step "1.1"
    Then I should see shared files: ["src/auth.ts"]

  # --- EDGE CASES ---

  Scenario: Multiple conflict groups are tracked independently
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    And step "3.1" modifies files ["src/api.ts"]
    And step "4.1" modifies files ["src/api.ts"]
    When I view the kanban board
    Then step "1.1" should show "conflicts: 1" (with 2.1)
    And step "3.1" should show "conflicts: 1" (with 4.1)
    And step "1.1" should not conflict with step "3.1"

  Scenario: Conflict count updates when card status changes to approved
    Given step "1.1" modifies files ["src/auth.ts"]
    And step "2.1" modifies files ["src/auth.ts"]
    And step "3.1" modifies files ["src/auth.ts"]
    And step "1.1" is in status "pending"
    And step "2.1" is in status "in_progress"
    And step "3.1" is in status "approved"
    When I view the kanban board
    Then step "1.1" should display "conflicts: 1"
    And step "2.1" should display "conflicts: 1"
    # 3.1 is done, so it doesn't contribute to conflict count

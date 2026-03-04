# Acceptance Criteria: Conflict Detection

## US-1: See Conflict Count Badge

### AC-1.1: Badge displays correct conflict count
```gherkin
Scenario: Two cards share one file
  Given step "1.1" has files_to_modify ["src/auth.ts", "src/utils.ts"]
  And step "2.1" has files_to_modify ["src/auth.ts", "src/api.ts"]
  And both steps have status "pending"
  When I view the kanban board
  Then step "1.1" displays badge "conflicts: 1"
  And step "2.1" displays badge "conflicts: 1"
```

### AC-1.2: Badge shows correct count for multiple conflicts
```gherkin
Scenario: One card conflicts with multiple others
  Given step "1.1" has files_to_modify ["src/auth.ts"]
  And step "2.1" has files_to_modify ["src/auth.ts"]
  And step "3.1" has files_to_modify ["src/auth.ts"]
  And all steps have status "pending"
  When I view the kanban board
  Then step "1.1" displays badge "conflicts: 2"
```

### AC-1.3: No badge when no conflicts
```gherkin
Scenario: Cards with no file overlap
  Given step "1.1" has files_to_modify ["src/auth.ts"]
  And step "2.1" has files_to_modify ["src/api.ts"]
  When I view the kanban board
  Then step "1.1" does not display a conflict badge
  And step "2.1" does not display a conflict badge
```

---

## US-2: See Worktree Recommendation

### AC-2.1: Worktree badge shown when conflicting with in_progress
```gherkin
Scenario: Pending card conflicts with in_progress card
  Given step "1.1" has files_to_modify ["src/auth.ts"]
  And step "1.1" has status "in_progress"
  And step "2.1" has files_to_modify ["src/auth.ts"]
  And step "2.1" has status "pending"
  When I view the kanban board
  Then step "2.1" displays badge "needs worktree"
```

### AC-2.2: Worktree badge applies to all in_progress-like statuses
```gherkin
Scenario Outline: Worktree needed for active work statuses
  Given step "1.1" has status "<active_status>"
  And step "1.1" has files_to_modify ["src/auth.ts"]
  And step "2.1" has status "pending"
  And step "2.1" has files_to_modify ["src/auth.ts"]
  When I view the kanban board
  Then step "2.1" displays badge "needs worktree"

  Examples:
    | active_status |
    | claimed       |
    | in_progress   |
    | review        |
```

### AC-2.3: No worktree badge when no in_progress conflicts
```gherkin
Scenario: All conflicting cards are pending
  Given step "1.1" and "2.1" share files
  And both have status "pending"
  When I view the kanban board
  Then neither card displays "needs worktree" badge
  But both display "conflicts: 1" badge
```

---

## US-3: Hide Conflicts for Completed Work

### AC-3.1: No badge when all conflicting cards are approved
```gherkin
Scenario: All parties completed
  Given step "1.1" has files_to_modify ["src/auth.ts"]
  And step "2.1" has files_to_modify ["src/auth.ts"]
  And both steps have status "approved"
  When I view the kanban board
  Then step "1.1" does not display a conflict badge
  And step "2.1" does not display a conflict badge
```

### AC-3.2: Badge shown if ANY conflicting card is not approved
```gherkin
Scenario: One card still pending
  Given step "1.1" has status "approved" and files ["src/auth.ts"]
  And step "2.1" has status "pending" and files ["src/auth.ts"]
  When I view the kanban board
  Then step "2.1" displays badge "conflicts: 1"
  # 1.1 is approved so doesn't show badge, but 2.1 still has active conflict
```

---

## US-4: View Conflicting Card IDs on Hover

### AC-4.1: Tooltip shows conflicting step IDs
```gherkin
Scenario: Hover reveals conflict details
  Given step "1.1" conflicts with steps "2.1" and "3.1"
  When I hover over step "1.1" card
  Then I see tooltip text containing "Conflicts with: 2.1, 3.1"
```

### AC-4.2: Tooltip shows shared files
```gherkin
Scenario: Hover shows which files overlap
  Given step "1.1" has files ["src/auth.ts", "src/utils.ts"]
  And step "2.1" has files ["src/auth.ts", "src/api.ts"]
  When I hover over step "1.1" conflict badge
  Then I see shared files "src/auth.ts"
```

---

## US-5: Highlight Conflicting Cards on Click

### AC-5.1: Clicking card highlights conflicts
```gherkin
Scenario: Visual highlight on click
  Given step "1.1" conflicts with step "2.1"
  When I click on step "1.1" card
  Then step "2.1" is visually highlighted
  And the highlight persists until I click elsewhere
```

### AC-5.2: Highlight clears on outside click
```gherkin
Scenario: Clear highlight
  Given step "1.1" is selected and "2.1" is highlighted
  When I click on an empty area of the board
  Then step "2.1" is no longer highlighted
```

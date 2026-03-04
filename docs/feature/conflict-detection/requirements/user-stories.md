# User Stories: Conflict Detection

## Epic: Conflict Visibility for Kanban Board

### US-0: CLI Writes Conflict Data

**As a** system component,
**I want** `start-step` to write `conflicts_with` to roadmap.yaml,
**so that** the board can display conflict information without recomputing.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given step "1.1" has files_to_modify ["src/auth.ts"]
And step "2.1" is in_progress with files_to_modify ["src/auth.ts"]
When I run start-step for "1.1"
Then roadmap.yaml step "1.1" has conflicts_with: ["2.1"]
And roadmap.yaml step "2.1" has conflicts_with updated to include "1.1"
```

**Size**: S (3-5 story points)

---

### US-1: See Conflict Count Badge

**As a** team lead managing parallel AI agent work,
**I want to** see how many cards conflict with each card,
**so that** I know which work requires coordination.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given step "1.1" has conflicts_with: ["2.1"] in roadmap.yaml
When I view the kanban board
Then step "1.1" displays badge "conflicts: 1"
```

**Job Trace**: Primary Job — "See which cards will conflict due to shared files"

**Size**: XS (1-2 story points) — just read and display

---

### US-2: See Worktree Badge

**As a** team lead reviewing active work,
**I want to** see which cards are running in worktrees,
**so that** I know isolation is in place.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given step "1.1" has worktree: "/path/to/worktree" in roadmap.yaml
When I view the kanban board
Then step "1.1" displays badge "worktree"
```

**Note**: The CLI already creates worktrees automatically. This just displays the fact.

**Job Trace**: Primary Job — "Know worktree isolation is in place"

**Size**: XS (1-2 story points) — StepCard already has worktree prop, just wire it up

---

### US-3: Hide Conflicts for Completed Work

**As a** team lead reviewing the board,
**I want to** not see conflict warnings for completed cards,
**so that** the board stays clean and focused on active work.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given steps "1.1" and "2.1" share file "src/auth.ts"
And both steps are in status "approved"
When I view the kanban board
Then neither card displays a conflict badge
```

**Job Trace**: Secondary Job — "Historical conflicts not shown"

**Size**: XS (1-2 story points)

---

### US-4: View Conflicting Card IDs on Hover

**As a** team lead investigating a conflict,
**I want to** see which specific cards conflict with the current card,
**so that** I can understand the conflict scope.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given step "1.1" has conflicts_with: ["2.1", "3.1"] in roadmap.yaml
When I hover over step "1.1"
Then I see tooltip "Conflicts with: 2.1, 3.1"
```

**Job Trace**: Secondary Job — "Preview conflict impact before starting work"

**Size**: S (3-5 story points) — data already in props, just add tooltip

---

### US-5: Highlight Conflicting Cards on Click

**As a** team lead analyzing conflict clusters,
**I want to** visually highlight all related conflicting cards,
**so that** I can see conflict patterns across the board.

**Acceptance Criteria (Gherkin)**:
```gherkin
Given step "1.1" conflicts with step "2.1"
When I click on step "1.1"
Then step "2.1" is visually highlighted
And clicking elsewhere removes the highlight
```

**Job Trace**: Secondary Job — "Plan worktree usage"

**Size**: M (5-8 story points)

---

## Story Map

```
                    MUST HAVE              SHOULD HAVE           COULD HAVE
                    ─────────              ───────────           ──────────
CLI                 US-0: Write conflicts

Board Display       US-1: Count Badge      US-4: Hover IDs       US-5: Highlight
                    US-2: Worktree Badge
                    US-3: Hide Done
```

## Implementation Order

1. **US-0**: CLI writes `conflicts_with` (enables all board features)
2. **US-2**: Worktree badge (already have prop, just wire up)
3. **US-1**: Conflict count badge (read from props)
4. **US-3**: Hide completed (filter logic)
5. **US-4**: Hover tooltip (add tooltip component)
6. **US-5**: Click highlighting (visual enhancement)

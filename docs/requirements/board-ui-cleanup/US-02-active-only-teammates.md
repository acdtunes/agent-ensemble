# US-02: Active-Only Teammates Panel

## Problem

Andres is a project owner who checks the Teammates panel to understand current team engagement. He finds it cluttered because the panel shows every teammate who was ever assigned to any step -- including those who completed all their work and are now "Idle". On a project with 8 historical agents and only 2 currently active, Andres must mentally filter past 6 idle entries to find who is actually working right now.

## Who

- Project owner | Assessing real-time team workload | Wants instant clarity about which agents are currently engaged

## Job Story Trace

- **Job 2**: See Only Active Teammates
- When I glance at the Teammates panel to understand current team workload, I want to see only teammates actively working on steps, so I can instantly assess team engagement without filtering out idle ones.

## Solution

Modify the `deriveTeammates()` function in TeamPanel to return only teammates who have at least one step in an active status (claimed, in_progress, or review). Teammates whose only assignments are completed (approved), pending, or failed steps are excluded from the panel. The empty state message changes from "No teammates" to "No active teammates" to communicate that teammates exist but none are currently working.

## Domain Examples

### 1: Andres sees only the 2 active agents out of 8 total

Andres opens the board for "nw-teams" feature "directory-browser". The roadmap has steps assigned to 8 different agents. Six agents (crafter-01, crafter-02, crafter-03, crafter-04, crafter-05, crafter-06) have only completed ("approved") steps. Two agents (crafter-07 with step "API integration" in_progress, crafter-08 with step "Frontend polish" in review) are active. The Teammates panel shows only crafter-07 and crafter-08.

### 2: Active teammate still shows completed count

Crafter-07 has completed 4 steps and is currently working on "API integration" (in_progress). The Teammates panel shows crafter-07 with current step "API integration" and "4 completed" below -- preserving context about their track record while filtering out inactive agents.

### 3: All work done -- empty state

All 12 steps in the "board-ui-redesign" feature roadmap are approved. No agent has a step in claimed, in_progress, or review status. The Teammates panel shows "No active teammates" instead of listing all 4 agents as "Idle".

### 4: Claimed status counts as active

Crafter-04 has claimed step "Database migration" (status: claimed) but has not started work. The panel shows crafter-04 with current step "Database migration" because claimed is an active status -- the agent has signaled intent to work on this step.

## UAT Scenarios (BDD)

### Scenario 1: Panel shows only teammates with active steps

```gherkin
Given the roadmap for "nw-teams" feature "board-ui-redesign" has:
  | step_id | step_name        | status      | teammate_id |
  | 01-01   | Setup database   | approved    | crafter-01  |
  | 01-02   | Build API routes | in_progress | crafter-02  |
  | 02-01   | Write tests      | pending     | null        |
When Andres views the Teammates panel
Then the panel shows "crafter-02" with current step "Build API routes"
  And the panel does not show "crafter-01"
```

### Scenario 2: Active teammate shows completed count

```gherkin
Given crafter-03 has completed 4 steps and is currently working on "Integration tests" (in_progress)
When Andres views the Teammates panel
Then the panel shows "crafter-03" with current step "Integration tests"
  And the panel shows "4 completed" for crafter-03
```

### Scenario 3: Teammate in review status counts as active

```gherkin
Given crafter-01 has one step "Setup auth" in "review" status
  And crafter-01 has 2 previously completed steps
When Andres views the Teammates panel
Then the panel shows "crafter-01" with current step "Setup auth"
```

### Scenario 4: Empty state when no teammates are active

```gherkin
Given all steps in the roadmap are either "approved", "pending", or "failed"
  And no step has a teammate in "claimed", "in_progress", or "review" status
When Andres views the Teammates panel
Then the panel shows "No active teammates"
```

### Scenario 5: Claimed status counts as active

```gherkin
Given crafter-04 has claimed step "Database migration" (status: claimed) but has not started
When Andres views the Teammates panel
Then the panel shows "crafter-04" with current step "Database migration"
```

## Acceptance Criteria

- [ ] TeamPanel shows only teammates with at least one step in claimed, in_progress, or review status
- [ ] Active teammates still display their completed step count
- [ ] Empty state shows "No active teammates" (not "No teammates")
- [ ] Teammates with only approved, pending, or failed steps are excluded
- [ ] Claimed status is treated as active

## Technical Notes

- `deriveTeammates()` in `TeamPanel.tsx` currently iterates all steps and builds a map of all teammates. Add a post-filter step: remove entries where `currentStepName === null` (no active step).
- Consider using the shared `IN_PROGRESS_STATUSES` from `board/shared/types.ts` instead of the local `ACTIVE_STATUSES` constant to avoid divergence.
- The `Roadmap` prop to `TeamPanel` remains unchanged -- filtering is internal to the component.

## Dependencies

- None. This is a standalone modification of TeamPanel rendering logic.

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Panel shows every historical teammate, must mentally filter past idle ones" -- domain language |
| User/persona identified | PASS | "Project owner assessing real-time team workload" |
| 3+ domain examples | PASS | 4 examples with real agent IDs and step names |
| UAT scenarios (3-7) | PASS | 5 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 5 AC items covering active filter, empty state, claimed status |
| Right-sized | PASS | ~1 day effort, 5 scenarios, single demo-able change |
| Technical notes | PASS | deriveTeammates() modification, shared constant reference noted |
| Dependencies tracked | PASS | None -- standalone |

**DoR Status**: PASSED

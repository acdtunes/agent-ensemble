# US-01: Remove Activity Section from Board Sidebar

## Problem

Andres is a project owner monitoring multi-agent delivery across 3 concurrent features. He finds the Activity section in the board sidebar useless for decision-making because it shows raw status transitions (e.g., "01-01: pending -> in_progress") that require mental parsing and never lead to action. The Activity section consumes valuable vertical space, pushing the Teammates panel down and forcing scrolling on smaller viewports.

## Who

- Project owner | Monitoring 5-8 AI agents across multiple features | Wants to assess team status and work progress at a glance

## Job Story Trace

- **Job 1**: Declutter the Board Sidebar
- When I am monitoring a multi-agent delivery and the sidebar shows raw status transitions, I want to see only actionable information, so I can focus on team status without parsing noise.

## Solution

Remove the Activity section (heading + ActivityFeed component) from the BoardContent sidebar in App.tsx. The sidebar retains only the Teammates section. Transition data continues to flow via WebSocket for board card updates but is no longer rendered as a feed.

## Domain Examples

### 1: Andres monitors directory-browser feature -- no activity noise

Andres opens the board for the "nw-teams" project, "directory-browser" feature. The roadmap has 12 steps across 3 phases. Three agents (crafter-01, crafter-02, crafter-03) are active. Previously, the sidebar showed 35 transition entries below the Teammates panel, forcing Andres to scroll. Now the sidebar shows only the three active teammates, all visible without scrolling.

### 2: Feature board view also has no activity section

Andres navigates to the feature-level board for "board-ui-redesign" via the FeatureBoardView route. This view passes an empty transitions array (`[]`) to BoardContent. Previously, the empty ActivityFeed showed "No activity yet" -- wasted space. Now the sidebar shows only the Teammates panel.

### 3: WebSocket updates still refresh board cards

While Andres has the board open, crafter-02 completes step "02-03" and it transitions from "in_progress" to "review". The WebSocket delivers an `update` message. The kanban card for "02-03" moves from the In Progress column to the Review column. No activity feed entry is rendered -- the card movement itself provides the status update.

## UAT Scenarios (BDD)

### Scenario 1: Board sidebar does not show activity feed

```gherkin
Given Andres opens the board for project "nw-teams" feature "directory-browser"
  And the roadmap has 3 steps with 2 transitions recorded
When the board finishes loading
Then the sidebar does not contain an "Activity" section
  And the sidebar shows only the "Teammates" section
```

### Scenario 2: Feature board view has no activity section

```gherkin
Given Andres opens the feature board for "nw-teams" feature "board-ui-redesign"
  And no transitions have been recorded for this feature
When the board finishes loading
Then the sidebar does not contain an "Activity" section
  And no "No activity yet" empty state is rendered
```

### Scenario 3: Board card updates still work without activity feed

```gherkin
Given Andres has the board open for project "nw-teams"
  And step "02-03" transitions from "in_progress" to "review"
When the WebSocket delivers the update
Then the board reflects the updated step status on the kanban card
  And no activity feed entry is rendered
```

## Acceptance Criteria

- [ ] The board sidebar does not render an Activity section or ActivityFeed component
- [ ] The Teammates section is the sole content in the board sidebar
- [ ] WebSocket-driven board card updates continue to function
- [ ] Feature board views (FeatureBoardView) also have no Activity section

## Technical Notes

- The `ActivityFeed` component and its test file can be deleted or left unused -- implementer's choice
- The `transitions` prop on `BoardContent` can be removed if no other consumers exist
- The `RoadmapTransition` type in `shared/types.ts` remains (used by WebSocket protocol)
- The `ServerWSMessage` type with `roadmapTransitions` field remains (server protocol unchanged)

## Dependencies

- None. This is a standalone removal.

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Activity section useless for decision-making, consumes vertical space" -- domain language |
| User/persona identified | PASS | "Andres, project owner monitoring 3 features with 5-8 AI agents" |
| 3+ domain examples | PASS | 3 examples with real project/feature names and specific scenarios |
| UAT scenarios (3-7) | PASS | 3 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 4 AC items derived from the 3 scenarios |
| Right-sized | PASS | ~1 day effort, 3 scenarios, single demo-able change |
| Technical notes | PASS | Component cleanup options, prop removal, type preservation noted |
| Dependencies tracked | PASS | None -- standalone |

**DoR Status**: PASSED

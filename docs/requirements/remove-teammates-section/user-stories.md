# User Stories: Remove Teammates Section

## Epic Summary

Remove the Teammates sidebar section and agent assignment indicators from the board to create a cleaner, more focused monitoring experience.

---

## US-01: Remove Teammates Sidebar

**As a** project owner monitoring delivery,
**I want** the Kanban board to use full screen width,
**So that** I can see more cards and phases without a sidebar consuming space.

### Acceptance Criteria

```gherkin
Given I am on the board view
When the page loads
Then the Kanban board should span the full available width
And there should be no "Teammates" section in the sidebar
And there should be no sidebar at all
```

### Job Story Trace
- JS-01: Full Board Visibility

### Implementation Notes
- Remove `TeamPanel` component usage from `App.tsx`
- Change grid layout from `lg:grid-cols-4` to full-width
- `TeamPanel.tsx` can be deleted or archived

---

## US-02: Remove Agent Indicator from Cards

**As a** project owner scanning the board,
**I want** cards to show only step name and status,
**So that** I can process information faster without agent-related visual noise.

### Acceptance Criteria

```gherkin
Given a step is assigned to an agent
And the step is in "pending", "in_progress", or "review" status
When I view the card on the board
Then the card should not display the agent ID
And the card should not display a teammate emoji
And the card should still display the step name
And the card should still have status-based color coding
```

### Job Story Trace
- JS-02: Reduced Cognitive Load
- JS-03: Focus on Work, Not Workers

### Implementation Notes
- Remove teammate indicator from `StepCard.tsx` (lines 55-56, 99-102)
- Keep status colors and step name display

---

## US-03: Remove Agent from Step Detail Modal

**As a** project owner reviewing step details,
**I want** the modal to focus on step information,
**So that** I see relevant details without non-actionable agent identity.

### Acceptance Criteria

```gherkin
Given I click on a card to open the step detail modal
When the modal displays
Then the modal header should show the step name
And the modal header should show the step ID and status
And the modal header should not display an agent identifier
And the modal header should not display a teammate emoji
And all other modal sections (Description, Files, Dependencies, Review History) should remain unchanged
```

### Job Story Trace
- JS-03: Focus on Work, Not Workers

### Implementation Notes
- Remove teammate display from `StepDetailModal.tsx` header (lines 99-103)
- Keep all other modal functionality intact

---

## Story Map

```
                    EPIC: Remove Teammates Section
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
    US-01                    US-02                    US-03
 Remove Sidebar         Remove from Cards       Remove from Modal
        │                        │                        │
        ▼                        ▼                        ▼
  Full-width board      Cleaner card design    Focused modal header
```

---

## Dependencies

| Story | Depends On | Blocks |
|-------|------------|--------|
| US-01 | None | None |
| US-02 | None | None |
| US-03 | None | None |

All stories are independent and can be implemented in parallel.

---

## Out of Scope

- Removing `teammate_id` from the data model (data preserved for potential future use)
- Removing teammate color/emoji utility functions (may be used elsewhere)
- Adding new sidebar content (separate feature if needed)

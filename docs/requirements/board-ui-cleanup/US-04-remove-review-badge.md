# US-04: Remove Review Badge from Cards

## Problem

Andres is a project owner scanning the kanban board to quickly identify task status and ownership. He finds the review count badges on cards (e.g., "2 reviews") add visual clutter without providing actionable information. Seeing "2 reviews" tells him nothing about whether the step had minor formatting issues or critical logic bugs. The badge occupies card space that could be cleaner, and the information it conveys (a number) does not help him make any decision at the card level.

## Who

- Project owner | Scanning kanban cards for quick status assessment | Wants cards to show only essential, actionable information

## Job Story Trace

- **Job 4a**: Remove Review Badge from Cards (part of "Replace Review Badge with Review History")
- When I see a review badge on a board card, I want it removed because a count without context adds noise, so I can scan cards faster with only meaningful indicators visible.

## Solution

Remove the review count badge rendering from the StepCard component. The `reviewCount` field remains on `StepCardData` (no schema change) and continues to be available in the StepDetailModal timing section. Other badges (worktree, blocked) are unaffected.

## Domain Examples

### 1: Card with 2 review attempts -- no badge shown

Step "01-02 Build API routes" has 2 review attempts and is currently in "in_progress" status assigned to crafter-01. Previously the card showed an orange badge "2 reviews". Now the card shows: step name "Build API routes", step ID "01-02", file count "2 files", teammate "crafter-01". No review badge. The review information (2 attempts) remains visible in the step detail modal under Timing.

### 2: Card with 0 review attempts -- no change

Step "02-01 Write integration tests" has 0 review attempts. Previously and now, no review badge appears. The card appearance is identical. This confirms the removal does not affect cards that never had the badge.

### 3: Blocked card retains blocked badge

Step "03-01 Deploy" has 1 review attempt and is blocked by a dependency. Previously the card showed both "1 review" and "blocked" badges. Now it shows only the "blocked" badge. The review information remains in the modal.

## UAT Scenarios (BDD)

### Scenario 1: Card does not show review count badge

```gherkin
Given step "01-02 Build API routes" has 2 review attempts
  And step "01-02" is in "in_progress" status
When Andres views the card on the board
Then the card does not display a review count badge
  And the card still shows the worktree badge if the step has a worktree
  And the card still shows the blocked badge if the step is blocked
```

### Scenario 2: Step detail modal still shows review attempts

```gherkin
Given step "01-02 Build API routes" has 2 review attempts
  And step "01-02" started at "2026-03-01T09:00:00Z"
When Andres opens the step detail modal for "01-02"
Then the modal timing section shows "2 review attempts"
```

### Scenario 3: Card with zero reviews is unaffected

```gherkin
Given step "02-01 Write tests" has 0 review attempts
When Andres views the card on the board
Then the card displays step name, ID, file count, and teammate
  And no review badge area is present
```

## Acceptance Criteria

- [ ] StepCard does not render a review count badge regardless of reviewCount value
- [ ] StepCard continues to render worktree and blocked badges
- [ ] StepDetailModal continues to show review_attempts in the timing section
- [ ] StepCardData.reviewCount field remains in the type (no schema change)

## Technical Notes

- In `StepCard.tsx`, remove the block: `{card.reviewCount > 0 && (<Badge ...>...</Badge>)}`
- The `Badge` component itself remains (used for worktree and blocked badges)
- `StepCardData.reviewCount` field remains -- it may be used by US-05 (review history modal)
- No changes to `toStepCard()`, `statusMapping.ts`, or any test fixtures beyond StepCard tests

## Dependencies

- None. Standalone rendering change in StepCard.
- Related to US-05 (Review History in Modal) but independent -- US-04 can ship before US-05.

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Review count badges add visual clutter without actionable information" |
| User/persona identified | PASS | "Project owner scanning kanban cards for quick status assessment" |
| 3+ domain examples | PASS | 3 examples: card with reviews, card without, blocked card |
| UAT scenarios (3-7) | PASS | 3 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 4 AC items covering badge removal and preservation of other badges |
| Right-sized | PASS | <1 day effort, 3 scenarios, single line removal |
| Technical notes | PASS | Specific line to remove identified, Badge component preservation noted |
| Dependencies tracked | PASS | None -- standalone; relationship to US-05 documented |

**DoR Status**: PASSED

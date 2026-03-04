# US-03: Clean Done Card Appearance

## Problem

Andres is a project owner scanning the kanban board to understand work distribution. He finds the Done column visually noisy because completed cards display teammate indicators even when the teammate has been unassigned (teammate_id is null). This creates a micro-confusion: Andres reads a teammate name on a done card and momentarily wonders "is this person still working?" before realizing the card is done. This happens dozens of times per board scan across multiple phases.

## Who

- Project owner | Scanning kanban board for active work distribution | Wants done cards to feel resolved and clean

## Job Story Trace

- **Job 3**: Clean Up Done Cards
- When I look at the Done column and see teammate indicators on completed cards, I want done cards to show only essential completion information when the teammate is unassigned, so I can focus on who is actively working on what.

## Solution

In the StepCard component, conditionally hide the teammate indicator when the card is in the "done" display column AND the teammate_id is null (unassigned). Cards with assigned teammates in the done column continue to show the indicator. Cards in all other columns (pending, in_progress, review) continue to show teammate indicators when present.

## Domain Examples

### 1: Completed step with unassigned teammate -- clean card

Step "01-01 Setup database" is approved. After completion, the teammate (crafter-01) was unassigned (teammate_id set to null in the roadmap YAML). When Andres views the Done column, the card for "01-01" shows: step name "Setup database", step ID "01-01", and file count "3 files". No teammate indicator appears. The card feels resolved.

### 2: Completed step with still-assigned teammate -- teammate visible

Step "01-02 Build API routes" is approved but crafter-02 remains assigned (teammate_id is "crafter-02"). When Andres views the Done column, the card for "01-02" shows the teammate indicator with the person icon and "crafter-02" label. This is intentional -- the teammate is still associated with this step.

### 3: Active card always shows teammate

Step "02-01 Write integration tests" is in_progress with crafter-03 assigned. Regardless of whether the card is in the In Progress, Review, or Pending column, the teammate indicator always appears. The conditional hiding applies only to the Done column with null teammate_id.

## UAT Scenarios (BDD)

### Scenario 1: Done card with unassigned teammate shows no teammate indicator

```gherkin
Given step "01-01 Setup database" is approved
  And step "01-01" has teammate_id null (unassigned after completion)
When Andres views the card in the Done column
Then the card shows step name "Setup database" and ID "01-01"
  And the card does not display a teammate indicator
```

### Scenario 2: Done card with still-assigned teammate shows teammate indicator

```gherkin
Given step "01-02 Build API routes" is approved
  And step "01-02" has teammate_id "crafter-01" (still assigned)
When Andres views the card in the Done column
Then the card shows the teammate indicator for "crafter-01"
```

### Scenario 3: Active card always shows teammate indicator

```gherkin
Given step "02-01 Write tests" is in_progress
  And step "02-01" is assigned to teammate "crafter-02"
When Andres views the card in the In Progress column
Then the card displays the teammate indicator for "crafter-02"
```

### Scenario 4: Step detail modal not affected by card display rules

```gherkin
Given step "01-01 Setup database" is approved with teammate_id null
  And the card in the Done column shows no teammate indicator
When Andres clicks the card to open the step detail modal
Then the modal does not show a teammate section (teammate_id is null)
```

## Acceptance Criteria

- [ ] StepCard hides teammate indicator when displayColumn is "done" and teammateId is null
- [ ] StepCard shows teammate indicator when displayColumn is "done" and teammateId is not null
- [ ] StepCard always shows teammate indicator for non-done columns when teammateId is not null
- [ ] StepDetailModal teammate display is unchanged (shows when teammate_id is not null)

## Technical Notes

- The condition in `StepCard.tsx` changes from `card.teammateId !== null` to `card.teammateId !== null && !(card.displayColumn === 'done' && card.teammateId === null)` -- but since the first check already handles null, the actual logic simplifies to: the current code `card.teammateId !== null` already hides the indicator when teammate_id is null. The real question is whether the user wants to ALSO hide it when done + assigned. Based on the request ("when tickets are done AND teammates are unassigned"), the current code already handles this case: `teammateId !== null` shows indicator, `teammateId === null` hides it. So done cards with null teammate already hide the indicator. **Verify**: if this behavior is already present, the story may be a no-op or confirm existing behavior. If the intent is to hide teammate on ALL done cards regardless of assignment, that changes the logic.
- Given the user's explicit wording "when tickets are done AND teammates are unassigned", the condition is: hide when done AND null. Since `card.teammateId !== null` already covers this, the current behavior may already be correct. **Action**: verify with a test that done cards with null teammate_id do not show the indicator.

## Dependencies

- None. Standalone rendering change in StepCard.

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Done column visually noisy with teammate indicators on unassigned completed cards" |
| User/persona identified | PASS | "Project owner scanning kanban board for active work distribution" |
| 3+ domain examples | PASS | 3 examples covering unassigned done, assigned done, and active card |
| UAT scenarios (3-7) | PASS | 4 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 4 AC items covering all display conditions |
| Right-sized | PASS | <1 day effort (may be partially existing behavior), 4 scenarios |
| Technical notes | PASS | Logic analysis provided; verification note about existing behavior |
| Dependencies tracked | PASS | None -- standalone |

**DoR Status**: PASSED

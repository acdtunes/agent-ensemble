# US-05: Review History in Step Detail Modal

## Problem

Andres is a project owner who wants to understand the quality journey of each step -- not just "2 reviews happened" but what reviewers actually said, what was flagged, and what was fixed across review cycles. Currently, the step detail modal shows only a review attempt count (e.g., "2 review attempts") in the timing section. This tells Andres nothing about whether the step had minor formatting issues or critical logic bugs. To get review feedback, Andres must leave the board and dig through external execution logs or YAML files.

## Who

- Project owner | Auditing step quality history | Wants to understand what happened during reviews without leaving the board

## Job Story Trace

- **Job 4b**: Show Review History in Step Detail Modal (part of "Replace Review Badge with Review History")
- When I open a step detail and see only a review count, I want to see the actual reviewer feedback and the full review history, so I can understand what was flagged and fixed without digging through external logs.

## Solution

Add a "Review History" section to the StepDetailModal that displays each review cycle's feedback, timestamp, and outcome (approved/rejected). Entries are ordered newest-first. When review history data is not available (legacy roadmaps with only `review_attempts` count), the modal falls back to the current behavior of showing the count in the timing section.

## Domain Examples

### 1: Andres sees full review history for step with 2 cycles

Step "01-02 Build API routes" (crafter-01) was reviewed twice. Review #1 (2026-03-01T10:15:00Z, rejected): "Missing error handling for expired tokens. The auth middleware does not validate token expiry before granting access. Also: SQL injection risk in user lookup query." Review #2 (2026-03-02T15:30:00Z, approved): "All issues addressed. Authentication flow is correct. Error handling improved. Ready to merge." Andres opens the modal and sees both entries, newest first, with clear outcome labels.

### 2: Legacy step with count only -- graceful fallback

Step "01-03 Setup middleware" has `review_attempts: 3` but no `review_history` data (created before the review history feature). Andres opens the modal. The timing section shows "3 review attempts" as before. No empty "Review History" section appears. The experience is identical to today for legacy data.

### 3: Step with single review -- approved on first try

Step "02-01 Write integration tests" was approved on first review. Review #1 (2026-03-03T09:00:00Z, approved): "Tests cover all edge cases. Good coverage of error paths." Andres opens the modal and sees a single review entry in the Review History section.

### 4: Multi-line feedback preserves formatting

Step "01-02" has review feedback spanning multiple lines with specific issues listed. The modal renders the feedback with preserved line breaks so Andres can read each issue as a separate point.

## UAT Scenarios (BDD)

### Scenario 1: Modal shows review history with feedback

```gherkin
Given step "01-02 Build API routes" has the following review history:
  | cycle | timestamp            | outcome  | feedback                                     |
  | 1     | 2026-03-01T10:15:00Z | rejected | Missing error handling for expired tokens.    |
  | 2     | 2026-03-02T15:30:00Z | approved | All issues addressed. Ready to merge.         |
When Andres opens the step detail modal for "01-02"
Then the modal shows a "Review History" section
  And review #2 (approved, "All issues addressed") appears first
  And review #1 (rejected, "Missing error handling") appears second
```

### Scenario 2: Modal falls back to count when no feedback data exists

```gherkin
Given step "01-03 Setup middleware" has review_attempts 3
  And step "01-03" has no review_history data (legacy format)
When Andres opens the step detail modal for "01-03"
Then the modal shows "3 review attempts" in the timing section
  And no "Review History" section is displayed
```

### Scenario 3: Single review entry displayed correctly

```gherkin
Given step "02-01 Write tests" has one review:
  | cycle | timestamp            | outcome  | feedback                    |
  | 1     | 2026-03-03T09:00:00Z | approved | Tests cover all edge cases. |
When Andres opens the step detail modal for "02-01"
Then the modal shows a "Review History" section with one entry
  And the entry shows "Review #1" with outcome "approved"
```

### Scenario 4: No review section for zero-review steps

```gherkin
Given step "03-01 Deploy" has review_attempts 0 and no review_history
When Andres opens the step detail modal for "03-01"
Then the modal does not show a "Review History" section
  And the modal does not show review attempts in timing
```

### Scenario 5: Multi-line feedback preserves line breaks

```gherkin
Given step "01-02" has a review with multi-line feedback:
  """
  Missing error handling for expired tokens.
  The auth middleware does not validate token expiry.
  Also: SQL injection risk in user lookup query.
  """
When Andres opens the step detail modal for "01-02"
Then the review feedback displays with preserved line breaks
```

## Acceptance Criteria

- [ ] StepDetailModal shows a "Review History" section when review_history data is present
- [ ] Review entries display cycle number, timestamp, outcome (approved/rejected), and feedback text
- [ ] Review entries are ordered newest-first
- [ ] When no review_history data exists, modal falls back to showing review_attempts count in timing
- [ ] Steps with 0 review_attempts and no review_history show no review-related sections
- [ ] Multi-line feedback preserves line breaks

## Technical Notes

- **DEPENDENCY**: This story requires a new data structure for review feedback. The current `RoadmapStep` type has only `review_attempts: number`. A new optional field is needed, tentatively:
  ```typescript
  interface ReviewEntry {
    readonly cycle: number;
    readonly timestamp: string;
    readonly outcome: 'approved' | 'rejected';
    readonly feedback: string;
  }
  // On RoadmapStep:
  readonly review_history?: readonly ReviewEntry[];
  ```
- The YAML parser (`board/server/parser.ts`) must be updated to handle the optional `review_history` field
- Backward compatibility is critical: roadmaps without `review_history` must parse without error
- The `DetailSection` component pattern in StepDetailModal can be reused for the Review History section
- Consider a technical task or spike for the schema design before implementing this story

## Dependencies

- **Schema evolution**: `RoadmapStep` type must be extended with `review_history` field
- **YAML parser**: Must be updated to parse optional review_history from roadmap YAML
- **Execution log format**: The source of review feedback data needs to be defined (where does the reviewer feedback get written?)
- US-04 (Remove Review Badge) should ship first but is not a hard dependency

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Modal shows only count, must dig through external logs for actual feedback" |
| User/persona identified | PASS | "Project owner auditing step quality history" |
| 3+ domain examples | PASS | 4 examples: multi-cycle, legacy fallback, single review, multi-line |
| UAT scenarios (3-7) | PASS | 5 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 6 AC items covering history display, ordering, fallback, formatting |
| Right-sized | PASS | 2-3 days effort (includes schema + UI), 5 scenarios |
| Technical notes | PASS | Schema evolution described, parser update noted, backward compat flagged |
| Dependencies tracked | PASS | Schema evolution, parser update, execution log format all documented |

**DoR Status**: PASSED

# US-01: Persist Review Feedback on Step Transition

## Problem

Andres is a project owner who runs parallel feature delivery with agent teams. When a reviewer rejects a step with specific feedback ("Missing error handling for expired tokens"), the Lead calls `transition --status in_progress` to send the step back to the crafter. The reviewer's feedback text -- the exact reason for rejection -- is never persisted. It exists only as a message in the Lead's conversation. Once the session ends, the rejection reason is lost. Andres opens the step detail in the board UI and sees "2 review attempts" but has no idea whether those were minor formatting issues or critical security bugs.

## Who

- Project owner | Auditing step quality during/after parallel execution | Wants to understand what reviewers flagged without accessing conversation logs

## Job Story Trace

- **Job**: When a reviewer rejects a step during parallel execution, I want the rejection feedback persisted in roadmap.yaml, so I can see what was flagged from the board UI.
- **Forces**: Push (feedback lost in ephemeral conversations) / Pull (board UI already renders review_history) / Anxiety (will new flags break existing workflow?) / Habit (Lead currently calls transition with 4 flags)

## Solution

Add optional `--outcome` and `--feedback` flags to the `transition` command in `team_state.py`. When provided, the command appends a structured `review_history` entry to the step in both roadmap.yaml and state.yaml. When omitted, existing behavior is preserved (only review_attempts incremented).

## Domain Examples

### 1: Andres sees rejection feedback for step 01-02 (rejection with detailed feedback)

The reviewer for step "01-02 Build API routes" (crafter-01-02) finds security issues. The reviewer messages the Lead: "Step 01-02 NEEDS_REVISION: Missing error handling for expired tokens. The auth middleware does not validate token expiry before granting access." The Lead calls:

```
transition --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02 --status in_progress \
  --outcome rejected \
  --feedback "Missing error handling for expired tokens. The auth middleware does not validate token expiry before granting access."
```

roadmap.yaml now has:
```yaml
review_history:
  - cycle: 1
    timestamp: "2026-03-01T10:15:00Z"
    outcome: rejected
    feedback: "Missing error handling for expired tokens. The auth middleware does not validate token expiry before granting access."
```

Andres opens the step detail modal in the board and sees the full rejection reason.

### 2: Lead calls transition without new flags (backward compatibility)

An existing execution workflow runs with the old Lead prompt that does not include --outcome or --feedback. The Lead calls:

```
transition --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02 --status review
```

Behavior is identical to before: review_attempts is incremented, no review_history entry is created. No error, no warning. Existing roadmaps continue to work.

### 3: Lead provides outcome "rejected" without feedback text

The reviewer gives a terse rejection: "Step 01-02 NEEDS_REVISION" without detailed feedback. The Lead calls:

```
transition --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02 --status in_progress \
  --outcome rejected
```

The CLI records a review_history entry with an empty string for feedback. The board UI renders "Cycle 1 - Rejected" with no feedback text below. This is better than losing the fact that a rejection happened.

### 4: Lead provides invalid outcome value

The Lead mistakenly calls:

```
transition ... --outcome maybe --feedback "not sure about this"
```

The CLI prints: "Error: invalid outcome 'maybe'. Valid: approved, rejected" and exits with code 2. No changes are written to roadmap.yaml or state.yaml.

## UAT Scenarios (BDD)

### Scenario 1: Transition with outcome and feedback records review_history entry

```gherkin
Given step "01-02" has status "review" with review_attempts 1 in roadmap.yaml
  And step "01-02" has status "review" with review_attempts 1 in state.yaml
When the Lead runs transition for step "01-02" to status "in_progress" with outcome "rejected" and feedback "Missing error handling for expired tokens."
Then roadmap.yaml step "01-02" has status "in_progress"
  And roadmap.yaml step "01-02" has a review_history list with 1 entry
  And the entry has cycle 1, outcome "rejected", feedback "Missing error handling for expired tokens."
  And the entry has a valid ISO 8601 timestamp
  And state.yaml step "01-02" has a matching review_history entry
```

### Scenario 2: Transition without outcome flag preserves existing behavior

```gherkin
Given step "01-02" has status "review" with review_attempts 1 in roadmap.yaml
When the Lead runs transition for step "01-02" to status "in_progress" without outcome or feedback flags
Then roadmap.yaml step "01-02" has status "in_progress"
  And roadmap.yaml step "01-02" has no review_history field
  And review_attempts remains 1
```

### Scenario 3: Transition with outcome but no feedback records empty feedback

```gherkin
Given step "01-02" has status "review" with review_attempts 1
When the Lead runs transition for step "01-02" to status "in_progress" with outcome "rejected" and no feedback flag
Then roadmap.yaml step "01-02" has a review_history entry with cycle 1, outcome "rejected", and feedback ""
```

### Scenario 4: Invalid outcome value rejected by CLI

```gherkin
Given step "01-02" has status "review" in roadmap.yaml
When the Lead runs transition for step "01-02" with outcome "maybe" and feedback "not sure"
Then the CLI prints an error message containing "invalid outcome 'maybe'"
  And the CLI exits with code 2
  And roadmap.yaml step "01-02" is unchanged
  And state.yaml step "01-02" is unchanged
```

### Scenario 5: Multiple rejections accumulate review_history entries

```gherkin
Given step "01-02" has an existing review_history entry at cycle 1 with outcome "rejected"
  And step "01-02" has status "review" with review_attempts 2
When the Lead runs transition for step "01-02" to status "in_progress" with outcome "rejected" and feedback "Still missing edge case for empty token."
Then roadmap.yaml step "01-02" review_history has 2 entries
  And entry at cycle 1 has outcome "rejected"
  And entry at cycle 2 has outcome "rejected" and feedback "Still missing edge case for empty token."
```

## Acceptance Criteria

- [ ] `transition` command accepts optional `--outcome` flag with values "approved" or "rejected"
- [ ] `transition` command accepts optional `--feedback` flag with a string value
- [ ] When --outcome is provided, a review_history entry is appended to the step in roadmap.yaml
- [ ] When --outcome is provided, a matching review_history entry is appended in state.yaml
- [ ] Each review_history entry contains cycle (from review_attempts), timestamp (UTC ISO 8601), outcome, and feedback
- [ ] When --outcome is omitted, no review_history entry is created (backward compatible)
- [ ] When --outcome is provided without --feedback, feedback defaults to empty string
- [ ] Invalid --outcome values are rejected with error message and exit code 2
- [ ] Existing roadmap.yaml comments and formatting are preserved (ruamel.yaml roundtrip)

## Technical Notes

- **review_history field**: Must be a YAML list under the step, matching the schema validated by `board/server/parser.ts` (isValidReviewEntry function)
- **cycle derivation**: Use current review_attempts value at the time the entry is written. For `transition --status in_progress` (rejection), review_attempts was already incremented during the preceding `transition --status review` call
- **ruamel.yaml**: The codebase already uses ruamel.yaml for roundtrip preservation in _load_roadmap / _save_roadmap
- **VALID_OUTCOMES constant**: Add `VALID_OUTCOMES = {"approved", "rejected"}` to match parser.ts REVIEW_OUTCOMES set
- **_parse_named_args update**: Add "outcome" and "feedback" to the named_flags list in cmd_transition

## Dependencies

- None -- this is the foundational story
- Blocked by: nothing
- Enables: US-02 (complete-step persistence), TT-01 (execute.md update)

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Reviewer feedback is never persisted. Exists only as message in Lead's conversation. Once session ends, rejection reason is lost." |
| User/persona identified | PASS | "Project owner auditing step quality during/after parallel execution" |
| 3+ domain examples | PASS | 4 examples: rejection with feedback, backward compat, outcome without feedback, invalid outcome |
| UAT scenarios (3-7) | PASS | 5 scenarios covering happy path, backward compat, empty feedback, validation, accumulation |
| AC derived from UAT | PASS | 9 AC items traced from scenarios |
| Right-sized | PASS | 1-2 days effort, 5 scenarios, single command modification |
| Technical notes | PASS | cycle derivation, ruamel.yaml roundtrip, VALID_OUTCOMES constant, parser alignment |
| Dependencies tracked | PASS | No blockers, enables US-02 and TT-01 |

**DoR Status**: PASSED

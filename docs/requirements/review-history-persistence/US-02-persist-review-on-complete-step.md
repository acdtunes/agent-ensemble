# US-02: Persist Review Feedback on Step Completion

## Problem

Andres is a project owner who runs parallel feature delivery with agent teams. When a reviewer approves a step, the Lead calls `complete-step` to mark it as approved. The reviewer's approval feedback ("All issues addressed. Authentication flow is correct. Ready to merge.") is never recorded. Andres opens the board UI and sees the step is approved but cannot tell whether the approval came with caveats, conditional notes, or clean praise. For steps that went through multiple review cycles, the approval feedback is the final chapter of the quality story -- and it is missing.

## Who

- Project owner | Auditing step quality after execution completes | Wants to see the full review journey including the final approval

## Job Story Trace

- **Job**: When a reviewer approves a step during parallel execution, I want the approval feedback persisted in roadmap.yaml, so I can see the complete review story from the board UI.
- **Forces**: Push (approval feedback lost, cannot distinguish clean approval from reluctant approval) / Pull (completes the review_history data pipeline to existing board UI) / Anxiety (complete-step also handles worktree merge -- adding complexity to a critical path) / Habit (Lead calls complete-step with 3 flags currently)

## Solution

Add optional `--outcome` and `--feedback` flags to the `complete-step` command in `team_state.py`. When provided, the command appends a structured `review_history` entry to the step in both roadmap.yaml and state.yaml before marking the step as approved. When omitted, existing behavior is preserved.

## Domain Examples

### 1: Andres sees approval feedback for step 01-02 (clean approval after one cycle)

Step "01-02 Build API routes" was approved on first review. The reviewer messages: "Step 01-02 APPROVED: Tests cover all edge cases. Good coverage of error paths." The Lead calls:

```
complete-step --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02 \
  --outcome approved \
  --feedback "Tests cover all edge cases. Good coverage of error paths."
```

roadmap.yaml now has:
```yaml
review_history:
  - cycle: 1
    timestamp: "2026-03-03T09:00:00Z"
    outcome: approved
    feedback: "Tests cover all edge cases. Good coverage of error paths."
```

### 2: Andres sees full cycle -- rejection then approval (multi-cycle history)

Step "01-02" was rejected at cycle 1 (review_history already has the rejection entry from US-01). At cycle 2, the reviewer approves. The Lead calls:

```
complete-step --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02 \
  --outcome approved \
  --feedback "All issues addressed. Authentication flow is correct. Ready to merge."
```

roadmap.yaml review_history now has 2 entries:
```yaml
review_history:
  - cycle: 1
    timestamp: "2026-03-01T10:15:00Z"
    outcome: rejected
    feedback: "Missing error handling for expired tokens."
  - cycle: 2
    timestamp: "2026-03-02T15:30:00Z"
    outcome: approved
    feedback: "All issues addressed. Authentication flow is correct. Ready to merge."
```

Andres opens the modal and sees the complete quality journey.

### 3: Lead calls complete-step without new flags (backward compatibility)

An existing execution workflow runs with the old Lead prompt. The Lead calls:

```
complete-step --state .nw-teams/state.yaml \
  --roadmap docs/feature/auth-feature/roadmap.yaml \
  --step 01-02
```

Behavior is identical to before: status set to approved, worktree merged if applicable. No review_history entry created.

### 4: Complete-step with worktree merge and review data

Step "02-03" used a worktree. The Lead calls complete-step with --outcome and --feedback. The command:
1. Records the review_history entry in both files
2. Sets status to approved
3. Merges the worktree branch

Output: `COMPLETED 02-03 MERGE_OK`

The review_history entry is written regardless of whether the worktree merge succeeds or conflicts.

## UAT Scenarios (BDD)

### Scenario 1: complete-step with outcome and feedback records review_history entry

```gherkin
Given step "01-02" has status "review" with review_attempts 1 in roadmap.yaml
  And step "01-02" has no existing review_history
When the Lead runs complete-step for step "01-02" with outcome "approved" and feedback "Tests cover all edge cases."
Then roadmap.yaml step "01-02" has status "approved"
  And roadmap.yaml step "01-02" has a review_history list with 1 entry
  And the entry has cycle 1, outcome "approved", feedback "Tests cover all edge cases."
  And the entry has a valid ISO 8601 timestamp
  And state.yaml step "01-02" has a matching review_history entry
```

### Scenario 2: complete-step appends to existing review_history

```gherkin
Given step "01-02" has review_history with 1 entry (cycle 1, rejected)
  And step "01-02" has status "review" with review_attempts 2
When the Lead runs complete-step for step "01-02" with outcome "approved" and feedback "All issues addressed. Ready to merge."
Then roadmap.yaml step "01-02" review_history has 2 entries
  And entry at cycle 1 is unchanged (rejected)
  And entry at cycle 2 has outcome "approved" and feedback "All issues addressed. Ready to merge."
```

### Scenario 3: complete-step without outcome flag preserves existing behavior

```gherkin
Given step "01-02" has status "review" with review_attempts 1
When the Lead runs complete-step for step "01-02" without outcome or feedback flags
Then roadmap.yaml step "01-02" has status "approved"
  And roadmap.yaml step "01-02" has no review_history field
```

### Scenario 4: complete-step with worktree records review_history before merge

```gherkin
Given step "02-03" has status "review" and uses a worktree
When the Lead runs complete-step for step "02-03" with outcome "approved" and feedback "Clean implementation."
Then roadmap.yaml step "02-03" has a review_history entry with outcome "approved"
  And the worktree merge proceeds after review_history is recorded
  And the CLI outputs "COMPLETED 02-03 MERGE_OK"
```

### Scenario 5: complete-step with outcome but no feedback

```gherkin
Given step "01-02" has status "review" with review_attempts 1
When the Lead runs complete-step for step "01-02" with outcome "approved" and no feedback flag
Then roadmap.yaml step "01-02" has a review_history entry with cycle 1, outcome "approved", and feedback ""
```

## Acceptance Criteria

- [ ] `complete-step` command accepts optional `--outcome` flag with values "approved" or "rejected"
- [ ] `complete-step` command accepts optional `--feedback` flag with a string value
- [ ] When --outcome is provided, a review_history entry is appended to the step in roadmap.yaml
- [ ] When --outcome is provided, a matching review_history entry is appended in state.yaml
- [ ] review_history entry is written before worktree merge (data persisted even if merge conflicts)
- [ ] When --outcome is omitted, no review_history entry is created (backward compatible)
- [ ] When --outcome is provided without --feedback, feedback defaults to empty string
- [ ] Invalid --outcome values are rejected with error message and exit code 2
- [ ] CLI output (COMPLETED/MERGE_OK/MERGE_CONFLICT) is unchanged

## Technical Notes

- **Shared logic**: The review_history entry creation logic (building the dict, appending to list, deriving cycle from review_attempts) should be shared with US-01's transition command. Extract a helper function like `_append_review_entry(step, outcome, feedback, timestamp)`
- **Write order**: review_history must be written to both files BEFORE the worktree merge attempt. If merge fails (MERGE_CONFLICT), the review data is still persisted
- **_parse_named_args update**: Add "outcome" and "feedback" to the named_flags list in cmd_complete_step
- **complete-step does not increment review_attempts**: Unlike transition, complete-step does not touch review_attempts. The cycle number should use the current review_attempts value
- **Functional paradigm**: Per CLAUDE.md, this project follows functional programming. The helper function should be a pure function that takes step dict and returns updated step dict

## Dependencies

- US-01 (Persist Review on Transition) -- shares VALID_OUTCOMES constant and review_history entry creation logic
- Blocked by: US-01 (for shared helper function, though could be developed in parallel)
- Enables: TT-01 (execute.md update)

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Approval feedback is never recorded. Cannot distinguish clean approval from reluctant approval." |
| User/persona identified | PASS | "Project owner auditing step quality after execution completes" |
| 3+ domain examples | PASS | 4 examples: clean approval, multi-cycle, backward compat, worktree merge |
| UAT scenarios (3-7) | PASS | 5 scenarios covering approval recording, accumulation, backward compat, worktree, empty feedback |
| AC derived from UAT | PASS | 9 AC items traced from scenarios |
| Right-sized | PASS | 1-2 days effort, 5 scenarios, single command modification |
| Technical notes | PASS | Shared helper, write order before merge, functional paradigm note |
| Dependencies tracked | PASS | US-01 for shared logic, enables TT-01 |

**DoR Status**: PASSED

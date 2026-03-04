# TT-01: Update execute.md to Include Review Outcome and Feedback Flags

## Type

Technical Task

## Linked User Story

Enables US-01 (Persist Review on Transition) and US-02 (Persist Review on Complete-Step) by updating the Lead's workflow documentation to pass --outcome and --feedback when calling CLI commands.

## Problem

Even after the CLI supports --outcome and --feedback flags (US-01, US-02), the Lead agent will not use them unless `commands/execute.md` instructs it to. The Lead's behavior is driven entirely by the prompts in execute.md. Without this update, the feature exists but is never exercised.

## Scope

Update `commands/execute.md` in the following sections:

### 1. Phase 5 (Monitor and Coordinate) -- transition to review status

No change needed for `transition --status review` (this is when crafter submits FOR review, not when reviewer gives feedback).

### 2. Reviewer Spawning Protocol -- On APPROVED

Current:
```
1. Crafter messages the Lead: "Step {step_id} APPROVED"
2. Lead runs `complete-step` (marks approved + merges worktree if used)
```

Updated:
```
1. Crafter messages the Lead: "Step {step_id} APPROVED" with reviewer feedback
2. Lead runs `complete-step` with --outcome approved --feedback "{reviewer_feedback}"
```

### 3. Reviewer Spawning Protocol -- On NEEDS_REVISION

Current:
```
1. Crafter addresses feedback and messages the Lead again: "Step {step_id} ready for re-review"
2. Lead messages the same already-running reviewer
```

Updated (add before step 1):
```
0. Lead calls transition --status in_progress --outcome rejected --feedback "{reviewer_feedback}" for step {step_id}
1. Lead messages crafter with the rejection feedback
2. Crafter addresses feedback and messages the Lead again
```

### 4. CLI Tools section -- transition command example

Add --outcome and --feedback to the transition example:
```bash
python -m nw_teams.cli.team_state transition \
  --state .nw-teams/state.yaml \
  --roadmap docs/feature/{project-id}/roadmap.yaml \
  --step {step_id} \
  --status {review|in_progress|failed} \
  --outcome {approved|rejected} \
  --feedback "{reviewer_feedback_text}"
```

### 5. CLI Tools section -- complete-step command example

Add --outcome and --feedback to the complete-step example:
```bash
python -m nw_teams.cli.team_state complete-step \
  --state .nw-teams/state.yaml \
  --roadmap docs/feature/{project-id}/roadmap.yaml \
  --step {step_id} \
  --outcome approved \
  --feedback "{reviewer_feedback_text}"
```

### 6. Reviewer spawn prompt -- instruct reviewer to include feedback in verdict

Update reviewer spawn prompt to clarify that feedback text should be included:
```
3. Respond with one of:
   - 'Step {step_id} APPROVED: {specific feedback}' -- work meets quality standards
   - 'Step {step_id} NEEDS_REVISION: {specific feedback}' -- issues to fix
```

(Current prompt already includes this format, but verify it matches.)

### 7. Step Lifecycle Summary ASCII diagram

Add review_history recording to the lifecycle:
```
4. TRANSITION (atomic) -> review
   ...

4b. ON REVIEWER VERDICT:
   - APPROVED: Lead runs complete-step with --outcome/--feedback
   - REJECTED: Lead runs transition --status in_progress with --outcome/--feedback
```

## Acceptance Criteria

- [ ] CLI Tools section shows --outcome and --feedback in transition example
- [ ] CLI Tools section shows --outcome and --feedback in complete-step example
- [ ] Reviewer Spawning Protocol includes --outcome/--feedback in approval and rejection flows
- [ ] Reviewer spawn prompt maintains structured verdict format with feedback text
- [ ] Step Lifecycle Summary reflects review_history recording
- [ ] All --outcome/--feedback flags shown as optional (existing prompts still work without them)

## Dependencies

- US-01 and US-02 must be implemented (or in progress) for this to be useful
- This task can be done in parallel with US-01/US-02 as long as the flag names are agreed upon

---

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Lead won't use new flags unless execute.md instructs it to" |
| Scope identified | PASS | 7 specific sections in execute.md enumerated with before/after |
| AC defined | PASS | 6 items covering each section update |
| Right-sized | PASS | Documentation-only, under 1 day |
| Dependencies tracked | PASS | US-01/US-02 for flag names |

**DoR Status**: PASSED

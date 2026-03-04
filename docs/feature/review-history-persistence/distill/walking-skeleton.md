# Walking Skeleton: Review History Persistence

## Identified Skeleton

**Test**: `test_transition_records_rejection_with_feedback`

**User Goal**: Project owner can see why a step was rejected from the board UI.

**Journey**: Reviewer sends rejection verdict -> Lead calls transition with feedback -> roadmap.yaml updated with review_history -> Board UI displays rejection reason.

## Why This is the Walking Skeleton

This scenario is the simplest complete path that delivers observable user value:

1. **Minimal scope**: Single command (`transition`), single entry, single file
2. **User value**: Answers "can the project owner see rejection feedback?" with YES
3. **Demo-able**: Non-technical stakeholder can verify "the rejection reason appears in the file"
4. **Foundation**: All other scenarios build on this mechanism

## What Must Exist for First Green Test

### CLI Changes (src/agent_ensemble/cli/team_state.py)

1. **VALID_OUTCOMES constant**: `{"approved", "rejected"}`

2. **cmd_transition updates**:
   - Add `"outcome"` and `"feedback"` to `_parse_args` named_flags
   - Validate outcome value against VALID_OUTCOMES (exit 2 if invalid)
   - Create review_history entry when outcome provided:
     ```python
     {
         "cycle": step.get("review_attempts", 1),
         "timestamp": datetime.now(timezone.utc).isoformat(),
         "outcome": outcome,
         "feedback": feedback or ""
     }
     ```
   - Append entry to step["review_history"] (create list if needed)
   - Write updated roadmap via existing `_save_roadmap`

3. **No changes needed**:
   - Git/worktree logic (unaffected)
   - Other commands (update, show, check)
   - YAML round-trip preservation (already works)

### Estimated Implementation

- Add 2 flags to arg parser: ~5 lines
- Add validation: ~5 lines
- Add entry creation logic: ~10 lines
- Total: ~20 lines of production code

### Test Infrastructure (already exists)

- `tmp_path` fixture: pytest built-in
- `ruamel.yaml` for assertions: already used in test_team_state.py
- `main()` function import: already works

## First Test Command

```bash
pytest tests/test_review_history_persistence.py::test_transition_records_rejection_with_feedback -v
```

Expected initial result: **FAIL** (--outcome flag not recognized)

## Success Criteria for Walking Skeleton

When the walking skeleton passes:

1. CLI accepts `--outcome rejected --feedback "..."` on transition command
2. roadmap.yaml contains review_history list under the step
3. Entry has cycle, timestamp, outcome, feedback fields
4. YAML comments preserved (ruamel.yaml round-trip)
5. Exit code 0

## Next Steps After Skeleton

1. Enable `test_transition_without_outcome_preserves_existing_behavior`
2. Enable `test_invalid_outcome_value_rejected`
3. Implement `complete-step` flags (parallel or after)

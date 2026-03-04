# Shared Artifacts Registry: Review History Persistence

## Artifacts

### outcome

- **Source of truth**: Reviewer message to Lead ("APPROVED" / "NEEDS_REVISION")
- **Canonical values**: `approved`, `rejected` (as defined in `board/shared/types.ts` ReviewOutcome type)
- **Consumers**:
  - `src/nw_teams/cli/team_state.py` -- `--outcome` flag on `transition` and `complete-step`
  - `roadmap.yaml` -- `review_history[].outcome` field
  - `state.yaml` -- `review_history[].outcome` field
  - `board/server/parser.ts` -- `REVIEW_OUTCOMES` set validates on read
  - `board/src/components/StepDetailModal.tsx` -- renders outcome label and color
- **Owner**: team_state.py (writer), parser.ts (validator)
- **Integration risk**: HIGH -- if CLI writes a value not in REVIEW_OUTCOMES set ("approved", "rejected"), parser silently drops the entry
- **Validation**: CLI must validate outcome against the same set {"approved", "rejected"} before writing

### feedback

- **Source of truth**: Reviewer message to Lead (free-text feedback)
- **Consumers**:
  - `src/nw_teams/cli/team_state.py` -- `--feedback` flag on `transition` and `complete-step`
  - `roadmap.yaml` -- `review_history[].feedback` field
  - `state.yaml` -- `review_history[].feedback` field
  - `board/server/parser.ts` -- validates as string
  - `board/src/components/StepDetailModal.tsx` -- renders feedback text
- **Owner**: team_state.py (writer)
- **Integration risk**: LOW -- any string is valid
- **Validation**: Empty string acceptable when reviewer gives outcome without detailed feedback

### cycle

- **Source of truth**: Derived from `review_attempts` counter at time of recording
- **Consumers**:
  - `roadmap.yaml` -- `review_history[].cycle` field
  - `state.yaml` -- `review_history[].cycle` field
  - `board/server/parser.ts` -- validates as number
  - `board/src/components/StepDetailModal.tsx` -- renders "Cycle N" label, sorts newest-first
- **Owner**: team_state.py (computes at write time)
- **Integration risk**: MEDIUM -- cycle must be positive integer; must align with review_attempts
- **Validation**: cycle = review_attempts at time the entry is recorded

### timestamp

- **Source of truth**: `datetime.now(timezone.utc).isoformat()` in team_state.py
- **Consumers**:
  - `roadmap.yaml` -- `review_history[].timestamp` field
  - `state.yaml` -- `review_history[].timestamp` field
  - `board/server/parser.ts` -- validates as string
  - `board/src/components/StepDetailModal.tsx` -- formats for display
- **Owner**: team_state.py (generates at write time)
- **Integration risk**: LOW -- ISO 8601 format consistent with existing started_at/completed_at fields
- **Validation**: Must be valid ISO 8601 timestamp

### review_attempts

- **Source of truth**: `roadmap.yaml` step field (existing, incremented by team_state.py)
- **Consumers**:
  - `roadmap.yaml` -- step-level field
  - `state.yaml` -- step-level field
  - `board/src/components/StepDetailModal.tsx` -- timing section fallback when no review_history
  - `team_state.py` -- used to derive cycle number for review_history entries
- **Owner**: team_state.py
- **Integration risk**: MEDIUM -- review_attempts must stay in sync with review_history length when both exist
- **Validation**: After persisting, len(review_history) should equal number of entries written (may be less than review_attempts if feature enabled mid-execution)

## Integration Checkpoints

1. **CLI outcome values match parser validation set**: team_state.py VALID_OUTCOMES must equal parser.ts REVIEW_OUTCOMES
2. **YAML roundtrip preservation**: ruamel.yaml must preserve existing comments and formatting when adding review_history
3. **Backward compatibility**: roadmaps without review_history parse identically to before
4. **State/roadmap consistency**: review_history entries written to both files must be identical
5. **execute.md alignment**: Lead prompts in commands/execute.md must include --outcome and --feedback in the review workflow

## CLI Vocabulary Consistency

| Existing flag | New flag | Command | Notes |
|---------------|----------|---------|-------|
| --step | (unchanged) | transition, complete-step | Step identifier |
| --status | (unchanged) | transition | Target status |
| --state | (unchanged) | transition, complete-step | State file path |
| --roadmap | (unchanged) | transition, complete-step | Roadmap file path |
| (new) | --outcome | transition, complete-step | "approved" or "rejected" |
| (new) | --feedback | transition, complete-step | Review feedback text |

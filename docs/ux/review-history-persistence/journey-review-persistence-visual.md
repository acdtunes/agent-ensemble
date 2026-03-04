# Journey: Review History Persistence

## Overview

Persist reviewer feedback (outcome + feedback text) from the execution workflow into roadmap.yaml as structured `review_history` entries, completing the data pipeline to the board UI's StepDetailModal.

## Persona

Andres, a project owner who runs parallel feature delivery with agent teams. He uses the board UI to monitor execution and audit step quality.

## Emotional Arc

- **Start**: Frustrated -- reviewer feedback is trapped in ephemeral conversation logs
- **Middle**: Focused -- updating CLI to capture structured review data
- **End**: Confident -- all review feedback is visible in the board, no data loss

## Journey Flow

```
                    EXECUTION WORKFLOW (existing)
                    =============================

  Crafter finishes     Lead calls          Lead spawns
  work, messages  --> transition       --> reviewer
  Lead                --status review

                         |
                         v

  Reviewer sends     Lead receives
  APPROVED or   -->  reviewer message
  NEEDS_REVISION     with feedback text
  + feedback

                         |
          +--------------+---------------+
          |                              |
    APPROVED                      NEEDS_REVISION
          |                              |
          v                              v

  Lead calls                      Lead calls
  complete-step                   transition
  --step {id}                     --status in_progress
  --outcome approved              --outcome rejected
  --feedback "..."                --feedback "..."

          |                              |
          v                              v

  roadmap.yaml                    roadmap.yaml
  updated with:                   updated with:
  - status: approved              - status: in_progress
  - review_history entry          - review_history entry
    (cycle N, approved,             (cycle N, rejected,
     timestamp, feedback)            timestamp, feedback)

          |                              |
          v                              v

  Board UI renders               Crafter fixes,
  complete review                cycle repeats
  history in modal
```

## Step Details

### Step 1: Reviewer Sends Verdict (existing -- no change)

The reviewer sends a structured message to the Lead:
- "Step 01-02 APPROVED: All issues addressed. Authentication flow is correct."
- "Step 01-02 NEEDS_REVISION: Missing error handling for expired tokens."

Emotional state: Neutral (no change here)

### Step 2: Lead Calls CLI with Review Data (GAP -- new behavior)

On APPROVED:
```
$ python -m nw_teams.cli.team_state complete-step \
    --state .nw-teams/state.yaml \
    --roadmap docs/feature/auth-feature/roadmap.yaml \
    --step 01-02 \
    --outcome approved \
    --feedback "All issues addressed. Authentication flow is correct."
```

On NEEDS_REVISION:
```
$ python -m nw_teams.cli.team_state transition \
    --state .nw-teams/state.yaml \
    --roadmap docs/feature/auth-feature/roadmap.yaml \
    --step 01-02 \
    --status in_progress \
    --outcome rejected \
    --feedback "Missing error handling for expired tokens."
```

Emotional state: Confident -- explicit structured data capture

### Step 3: YAML Updated with review_history Entry (GAP -- new behavior)

After the CLI writes, roadmap.yaml contains:

```yaml
steps:
  - id: 01-02
    title: Build API routes
    status: approved
    review_attempts: 2
    review_history:
      - cycle: 1
        timestamp: "2026-03-01T10:15:00Z"
        outcome: rejected
        feedback: "Missing error handling for expired tokens."
      - cycle: 2
        timestamp: "2026-03-02T15:30:00Z"
        outcome: approved
        feedback: "All issues addressed. Authentication flow is correct."
```

Emotional state: Relief -- data is persisted, conversations can end safely

### Step 4: Board UI Renders Review History (existing -- no change)

StepDetailModal shows the "Review History" section with entries sorted newest-first.

Emotional state: Confident -- full audit trail visible

## Shared Artifacts

| Artifact | Source of Truth | Consumers |
|----------|----------------|-----------|
| ReviewEntry schema | `board/shared/types.ts` (ReviewEntry interface) | parser.ts, StepDetailModal.tsx, team_state.py |
| review_history YAML structure | roadmap.yaml (written by team_state.py) | board/server/parser.ts (reads) |
| review_attempts counter | roadmap.yaml (incremented by team_state.py) | StepDetailModal.tsx timing section |
| cycle number | Derived from review_attempts at write time | review_history[].cycle |
| outcome values | "approved" / "rejected" (enum in types.ts) | team_state.py --outcome flag |

## Error Paths

1. **Missing --feedback flag**: CLI should accept empty feedback gracefully (use empty string, not error)
2. **Missing --outcome flag**: When omitted, backward-compatible behavior -- no review_history entry written, only review_attempts incremented (existing behavior preserved)
3. **Invalid --outcome value**: CLI rejects with clear error: "Error: invalid outcome 'foo'. Valid: approved, rejected"
4. **YAML roundtrip**: ruamel.yaml preserves existing formatting when appending review_history entries

## Integration Checkpoints

1. **CLI-to-YAML**: review_history entries written by team_state.py must match the schema validated by parser.ts
2. **YAML-to-UI**: parser.ts validateReviewHistory must accept entries written by team_state.py
3. **Backward compatibility**: Existing roadmaps without review_history parse correctly (no regression)
4. **execute.md update**: Lead prompts must include --outcome and --feedback when calling transition/complete-step

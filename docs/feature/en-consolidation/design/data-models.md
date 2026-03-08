# EN Consolidation -- Data Models

## Algebraic Data Types

FP types-first approach. Domain values are immutable. These types describe WHAT the system models, not HOW to implement them -- the crafter decides representation.

### Step Status (Sum Type)

```
StepStatus = Pending | Claimed | InProgress | Review | Approved | Failed
```

- Terminal: `Approved`
- Active: `Claimed | InProgress | Review`
- Spawnable by next-steps: `Pending` (when all deps are terminal)

### Step (Product Type)

```
Step = {
  step_id: StepId,
  name: String,
  files_to_modify: Set[FilePath],
  deps: List[StepId],
  phase_id: PhaseId,
  description: String,
  status: StepStatus,
  teammate: Option[TeammateId],
  worktree: Option[WorktreePath],
  review_history: List[ReviewEntry]
}
```

Already implemented as `NamedTuple` in `parallel_groups.py` (without status/teammate fields -- those live in the roadmap dict).

### NextStepsResult (Product Type)

```
NextStepsResult = {
  ready_steps: List[ReadyStep],
  done: Boolean
}

ReadyStep = {
  step_id: StepId,
  isolation: Shared | Worktree { conflict_with: List[StepId] }
}
```

Output format for the `next-steps` CLI command.

### ReviewEntry (Product Type)

```
ReviewEntry = {
  cycle: Integer,
  outcome: Approved | Rejected,
  feedback: String,
  timestamp: ISO8601
}
```

Already implemented in team_state.py review_history tracking.

### SyncTransform (Product Type)

```
SyncTransform = {
  source: FilePath,        -- path in nwave/
  target: FilePath,        -- path in project root
  content_rules: List[RenameRule],
  file_rename: Option[RenameRule],
  is_override: Boolean     -- if true, never overwrite target
}

RenameRule = {
  pattern: String,
  replacement: String
}
```

Conceptual model for sync script transforms. Implemented as sed rules in bash.

### VendorVersion (Product Type)

```
VendorVersion = {
  tag: String,           -- upstream git tag (e.g. "v2.2.0")
  commit: String,        -- upstream commit SHA
  synced_at: ISO8601     -- timestamp of sync
}
```

Written to `nwave/VERSION` by `sync-nwave.sh`. Plain text key=value format for easy parsing in bash.

## Roadmap Schema (Existing -- from DES)

The roadmap is the central data store. Both `en/` and `des/` read/write it.

```yaml
roadmap:
  project_id: String
  goal: String
  short_description: String    # ~50 chars for board display
  description: String          # 1-2 sentences for board header

phases:
  - id: "01"
    name: String
    steps:
      - id: "01-01"
        name: String
        description: String    # Jira-style, 2-3 sentences
        criteria: List[String]
        files_to_modify: List[FilePath]
        deps: List[StepId]
        # Runtime state (managed by en.cli.team_state):
        status: StepStatus     # default: pending
        teammate: String       # crafter ID
        worktree: String       # worktree path if isolated
        review_history: List[ReviewEntry]
```

## Execution Log Schema (Existing -- from DES)

```yaml
execution_log:
  project_id: String
  started_at: ISO8601
  phases:
    - step_id: StepId
      tdd_phases:
        - phase: RED_ACCEPTANCE | RED_UNIT | GREEN | REFACTOR | COMMIT
          started_at: ISO8601
          completed_at: ISO8601
          result: PASS | FAIL
```

## CLI Output Formats

### next-steps Output

```
READY 01-01 [SHARED]
READY 01-02 [SHARED]
READY 01-03 [WORKTREE conflict_with=01-01]
---
```

Or when all steps are done:
```
DONE
```

Machine-parseable by the Lead (LLM). One line per ready step. `---` delimiter. `DONE` when no pending steps remain.

### start-step Output (Existing)

```
STARTED 01-01 [SHARED]
```
or
```
STARTED 01-01 [WORKTREE] .claude/worktrees/crafter-01-01
```

### complete-step Output (Existing)

```
COMPLETED 01-01
COMPLETED 01-01 MERGE_OK
COMPLETED 01-01 MERGE_CONFLICT
```

## State Transitions

```
pending --> claimed --> in_progress --> review --> approved
                            ^            |
                            |            v
                            +--- (NEEDS_REVISION)
                                  in_progress
```

`next-steps` only returns steps in `pending` status whose deps are all `approved`. The Lead calls `start-step` which atomically transitions to `in_progress`.

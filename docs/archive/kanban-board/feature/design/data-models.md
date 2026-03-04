# Data Models: Kanban Board

## Source Data: state.yaml

The kanban board reads directly from the YAML state file written by `team_state.py`. No transformation or migration needed — the board's TypeScript types mirror the YAML schema 1:1.

### Example state.yaml

```yaml
schema_version: "1.0"
created_at: "2026-02-28T10:00:00+00:00"
updated_at: "2026-02-28T10:15:30+00:00"
plan_path: ".nw-teams/plan.yaml"
current_layer: 2
summary:
  total_steps: 6
  total_layers: 2
  completed: 3
  failed: 0
  in_progress: 2
steps:
  01-01:
    step_id: "01-01"
    name: "Create user model"
    layer: 1
    status: approved
    teammate_id: crafter-01-01
    started_at: "2026-02-28T10:01:00+00:00"
    completed_at: "2026-02-28T10:08:00+00:00"
    review_attempts: 1
    files_to_modify:
      - src/models/user.ts
      - src/models/user.test.ts
  01-02:
    step_id: "01-02"
    name: "Create user repository"
    layer: 1
    status: approved
    teammate_id: crafter-01-02
    started_at: "2026-02-28T10:01:00+00:00"
    completed_at: "2026-02-28T10:10:00+00:00"
    review_attempts: 2
    files_to_modify:
      - src/repos/user-repo.ts
      - src/repos/user-repo.test.ts
  02-01:
    step_id: "02-01"
    name: "Auth middleware"
    layer: 2
    status: in_progress
    teammate_id: crafter-02-01
    started_at: "2026-02-28T10:11:00+00:00"
    completed_at: null
    review_attempts: 0
    files_to_modify:
      - src/middleware/auth.ts
      - src/middleware/auth.test.ts
    worktree: true
teammates:
  crafter-01-01:
    teammate_id: crafter-01-01
    current_step: null
    completed_steps: ["01-01"]
  crafter-02-01:
    teammate_id: crafter-02-01
    current_step: "02-01"
    completed_steps: []
```

## Source Data: plan.yaml

Read once at server startup. Provides execution layer structure and conflict annotations that state.yaml doesn't contain.

### Example plan.yaml

```yaml
schema_version: "1.0"
summary:
  total_steps: 6
  total_layers: 2
  max_parallelism: 3
  requires_worktrees: true
layers:
  - layer: 1
    parallel: true
    use_worktrees: false
    steps:
      - step_id: "01-01"
        name: "Create user model"
        files_to_modify: [src/models/user.ts, src/models/user.test.ts]
      - step_id: "01-02"
        name: "Create user repository"
        files_to_modify: [src/repos/user-repo.ts, src/repos/user-repo.test.ts]
      - step_id: "01-03"
        name: "Create user service"
        files_to_modify: [src/services/user-service.ts, src/services/user-service.test.ts]
  - layer: 2
    parallel: true
    use_worktrees: true
    steps:
      - step_id: "02-01"
        name: "Auth middleware"
        files_to_modify: [src/middleware/auth.ts, src/middleware/auth.test.ts, src/app.ts]
        conflicts_with: ["02-02"]
      - step_id: "02-02"
        name: "User controller"
        files_to_modify: [src/controllers/user.ts, src/controllers/user.test.ts, src/app.ts]
        conflicts_with: ["02-01"]
```

## Derived Data: StateTransition (computed by StateDiffer)

Not stored on disk. Computed in memory by comparing successive state snapshots. Accumulated in a ring buffer (max 200 entries) on the server and forwarded to connected clients.

```typescript
interface StateTransition {
  step_id: string;        // "02-01"
  from_status: StepStatus; // "in_progress"
  to_status: StepStatus;   // "review"
  teammate_id: string | null; // "crafter-02-01"
  timestamp: string;       // ISO 8601 from state.updated_at
}
```

## Status Color Mapping

Used by StepCard and KanbanBoard for visual encoding:

| Status | Color | Hex | Semantic |
|--------|-------|-----|----------|
| pending | Gray | #9CA3AF | Not started |
| claimed | Blue | #3B82F6 | Assigned, not yet working |
| in_progress | Amber | #F59E0B | Actively executing TDD |
| review | Purple | #8B5CF6 | Under reviewer scrutiny |
| approved | Green | #10B981 | Passed review |
| failed | Red | #EF4444 | Step failed |

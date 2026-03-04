# Architecture Design: Conflict Detection

## Overview

This feature surfaces existing conflict detection data in the kanban board UI. The CLI already computes file conflicts — we extend it to persist conflict metadata, then pass it through to the board for display.

**Architecture Pattern**: Data passthrough (no new computation in board)

## Quality Attributes

| Attribute | Priority | Rationale |
|-----------|----------|-----------|
| Maintainability | High | Single source of truth (CLI computes, board displays) |
| Testability | High | Pure functions, no side effects in display logic |
| Time-to-market | High | Minimal changes — extend existing data flow |

## C4 System Context

```mermaid
C4Context
    title System Context: Conflict Detection

    Person(teamLead, "Team Lead", "Manages parallel AI agent work")

    System(board, "Kanban Board", "Displays roadmap progress and conflicts")
    System(cli, "CLI (team_state.py)", "Manages roadmap state, detects conflicts")

    SystemDb(yaml, "roadmap.yaml", "Persists roadmap state including conflicts")

    Rel(teamLead, board, "Views conflicts")
    Rel(cli, yaml, "Writes conflicts_with, worktree")
    Rel(board, yaml, "Reads via server")
```

## C4 Container

```mermaid
C4Container
    title Container Diagram: Conflict Detection Data Flow

    Person(teamLead, "Team Lead")

    Container(cli, "CLI", "Python", "start-step detects conflicts, writes to YAML")
    ContainerDb(yaml, "roadmap.yaml", "YAML", "Step state including conflicts_with, worktree")
    Container(server, "Board Server", "Node.js/Express", "Parses YAML, serves via HTTP/WebSocket")
    Container(ui, "Board UI", "React", "Displays StepCard with conflict badges")

    Rel(cli, yaml, "Writes", "ruamel.yaml")
    Rel(server, yaml, "Watches & parses", "chokidar + yaml")
    Rel(server, ui, "Pushes updates", "WebSocket")
    Rel(teamLead, ui, "Views")
```

## C4 Component: CLI Changes

```mermaid
C4Component
    title Component Diagram: CLI Conflict Detection

    Container_Boundary(cli, "team_state.py") {
        Component(startStep, "cmd_start_step", "Starts step, detects conflicts")
        Component(detectConflicts, "_detect_file_conflicts", "Computes file overlaps")
        Component(getConflictingIds, "_get_conflicting_step_ids", "NEW: Returns step IDs not just files")
        Component(completeStep, "cmd_complete_step", "Completes step, clears conflicts")
    }

    ContainerDb(yaml, "roadmap.yaml")

    Rel(startStep, detectConflicts, "Uses")
    Rel(startStep, getConflictingIds, "Uses")
    Rel(startStep, yaml, "Writes conflicts_with")
    Rel(completeStep, yaml, "Clears conflicts_with")
```

## C4 Component: Board Changes

```mermaid
C4Component
    title Component Diagram: Board Conflict Display

    Container_Boundary(board, "Board UI") {
        Component(types, "types.ts", "RoadmapStep with worktree?, conflicts_with?")
        Component(mapping, "statusMapping.ts", "expandStepToStepCard reads new fields")
        Component(stepCard, "StepCard.tsx", "Displays worktree and conflicts badges")
    }

    Container(server, "Board Server")

    Rel(server, types, "Provides RoadmapStep")
    Rel(types, mapping, "Input")
    Rel(mapping, stepCard, "StepCardData with conflictsWith")
```

## Data Model Changes

### roadmap.yaml (Step)

```yaml
steps:
  - id: "1.1"
    name: "Implement auth"
    files_to_modify: ["src/auth.ts"]
    status: in_progress
    # NEW FIELDS:
    worktree: "/path/to/.claude/worktrees/crafter-1.1"  # Set by start-step if conflicts
    conflicts_with: ["2.1", "3.1"]                       # NEW: Step IDs sharing files
```

### TypeScript Types

```typescript
// board/shared/types.ts - RoadmapStep additions
export interface RoadmapStep {
  // ... existing fields ...
  readonly worktree?: string;              // NEW: Path if using worktree
  readonly conflicts_with?: readonly string[];  // NEW: Conflicting step IDs
}

// board/src/utils/statusMapping.ts - StepCardData additions
export interface StepCardData {
  // ... existing fields ...
  readonly conflictsWith: readonly string[];  // NEW: For display
}
```

## Integration Points

| Component | File | Change |
|-----------|------|--------|
| CLI | `src/agent_ensemble/cli/team_state.py` | Add `_get_conflicting_step_ids()`, write `conflicts_with` in `cmd_start_step` |
| Types | `board/shared/types.ts` | Add `worktree?`, `conflicts_with?` to `RoadmapStep` |
| Mapping | `board/src/utils/statusMapping.ts` | Read `worktree` (truthy), add `conflictsWith` to `StepCardData` |
| Display | `board/src/components/StepCard.tsx` | Add conflicts badge, tooltip |

## Decision: No Client-Side Computation

The CLI already has `_detect_file_conflicts()`. Rather than duplicate this logic in TypeScript:

1. CLI writes `conflicts_with: [step-ids]` to roadmap.yaml
2. Board reads and displays

**Benefits**:
- Single source of truth
- No sync issues between CLI and board logic
- Simpler board code (just display)

## Mutual Update Strategy

When step A starts and conflicts with active step B:
1. Write `conflicts_with: [B]` to step A
2. Update step B's `conflicts_with` to include A

When step A completes:
1. Clear `conflicts_with` from step A
2. Remove A from all other steps' `conflicts_with` arrays

This ensures the board always shows current conflict state.

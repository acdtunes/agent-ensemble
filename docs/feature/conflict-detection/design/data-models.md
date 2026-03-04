# Data Models: Conflict Detection

## roadmap.yaml Schema Extension

### Before (existing)

```yaml
phases:
  - id: 1
    name: "Phase 1"
    steps:
      - id: "1.1"
        name: "Implement auth"
        files_to_modify:
          - src/auth.ts
          - src/types.ts
        dependencies: []
        status: in_progress
        teammate_id: crafter-1.1
        started_at: "2024-01-15T10:00:00Z"
        completed_at: null
        review_attempts: 0
```

### After (with conflict fields)

```yaml
phases:
  - id: 1
    name: "Phase 1"
    steps:
      - id: "1.1"
        name: "Implement auth"
        files_to_modify:
          - src/auth.ts
          - src/types.ts
        dependencies: []
        status: in_progress
        teammate_id: crafter-1.1
        started_at: "2024-01-15T10:00:00Z"
        completed_at: null
        review_attempts: 0
        # NEW FIELDS:
        worktree: "/Users/dev/project/.claude/worktrees/crafter-1.1"
        conflicts_with:
          - "2.1"
          - "3.1"
```

## TypeScript Types

### RoadmapStep (board/shared/types.ts)

```typescript
export interface RoadmapStep {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly files_to_modify: readonly string[];
  readonly dependencies: readonly string[];
  readonly criteria: readonly string[];
  readonly status: StepStatus;
  readonly teammate_id: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly review_attempts: number;
  readonly review_history?: readonly ReviewEntry[];
  // NEW FIELDS:
  readonly worktree?: string;                    // Path to worktree if isolated
  readonly conflicts_with?: readonly string[];   // IDs of conflicting steps
}
```

### StepCardData (board/src/utils/statusMapping.ts)

```typescript
export interface StepCardData {
  readonly stepId: string;
  readonly stepName: string;
  readonly displayColumn: DisplayColumn;
  readonly fileCount: number;
  readonly files: readonly string[];
  readonly reviewCount: number;
  readonly worktree: boolean;           // CHANGE: Now derived from step.worktree
  readonly isBlocked: boolean;
  readonly teammateId: string | null;
  readonly dependencyCount: number;
  // NEW FIELD:
  readonly conflictsWith: readonly string[];  // For display in badge/tooltip
}
```

## Mapping Function Update

```typescript
export const expandStepToStepCard = (step: RoadmapStep, isBlocked: boolean): StepCardData => {
  const files = step.files_to_modify.length > 0
    ? step.files_to_modify
    : [step.name];

  return {
    stepId: step.id,
    stepName: step.name,
    displayColumn: mapStatusToDisplayColumn(step.status),
    fileCount: files.length,
    files,
    reviewCount: step.review_attempts,
    worktree: Boolean(step.worktree),           // CHANGE: Read from step
    isBlocked,
    teammateId: step.teammate_id,
    dependencyCount: step.dependencies.length,
    conflictsWith: step.conflicts_with ?? [],   // NEW: Pass through
  };
};
```

## Conflict State Lifecycle

```
Step Created (pending)
  └── conflicts_with: undefined

Step Started (start-step)
  ├── If conflicts detected:
  │   ├── worktree: "/path/to/worktree"
  │   ├── conflicts_with: ["other-step-ids"]
  │   └── Other steps updated to include this step
  └── If no conflicts:
      ├── worktree: undefined
      └── conflicts_with: undefined

Step Completed (complete-step)
  ├── conflicts_with: cleared (set to undefined or removed)
  ├── worktree: kept for reference (or cleared)
  └── Other steps' conflicts_with: this step removed
```

## Validation Rules

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `worktree` | string | No | Must be valid path if present |
| `conflicts_with` | string[] | No | Each ID must exist in roadmap |

## Backward Compatibility

- Both fields are optional (`?` in TypeScript, missing in YAML)
- Old roadmaps without these fields work unchanged
- Board displays nothing if fields are missing (graceful degradation)

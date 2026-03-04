# Data Models: Step-Level Card Refactoring

## StepCardData (replaces FileCardData)

```typescript
interface StepCardData {
  readonly stepId: string;
  readonly stepName: string;
  readonly displayColumn: DisplayColumn;
  readonly fileCount: number;
  readonly files: readonly string[];
  readonly reviewCount: number;
  readonly worktree: boolean;
  readonly isBlocked: boolean;
  readonly teammateId: string | null;
}
```

### Field Changes from FileCardData

| Field | FileCardData | StepCardData | Rationale |
|-------|-------------|-------------|-----------|
| `filename` | `string` (single file) | **removed** | No longer one card per file |
| `fileCount` | n/a | `number` | Displayed as "N files" subtitle |
| `files` | n/a | `readonly string[]` | Carries full list for tooltip/detail; derived from `StepState.files_to_modify` |
| `stepId` | unchanged | unchanged | |
| `stepName` | unchanged | unchanged | |
| `displayColumn` | unchanged | unchanged | |
| `reviewCount` | unchanged | unchanged | |
| `worktree` | unchanged | unchanged | |
| `isBlocked` | unchanged | unchanged | |
| `teammateId` | unchanged | unchanged | |

### Why `files` and `fileCount` Instead of Just `fileCount`

The card subtitle shows count ("3 files"), but the full file list is needed for:
- Tooltip on hover showing file names
- Passing to `StepDetailModal` on click (modal already shows file list from `StepState`, but having it on card data avoids a second lookup)
- Future: inline expand to show file list

`fileCount` is denormalized from `files.length` for rendering convenience. The transformation function derives both from the same source (`StepState.files_to_modify`).

## Transformation Function Signature Change

**Before**:
```
expandStepToFileCards :: (StepState, boolean) -> readonly FileCardData[]
```

**After**:
```
toStepCard :: (StepState, boolean) -> StepCardData
```

Single object return. No array. No fallback to step name for empty files (just `fileCount: 0`, `files: []`).

## StepCardProps (replaces FileCardProps)

```typescript
interface StepCardProps {
  readonly card: StepCardData;
  readonly onCardClick?: (stepId: string) => void;
}
```

Identical structure to `FileCardProps` with type reference updated.

## Unchanged Types

These types are not modified by this refactoring:

- `StepState` (shared/types.ts) -- source data, unchanged
- `DisplayColumn` / `DISPLAY_COLUMNS` -- column enum, unchanged
- `mapStatusToDisplayColumn` -- status mapping, unchanged
- `LayerLaneProps` -- props interface, unchanged (receives `StepState[]`, internal card type is private)

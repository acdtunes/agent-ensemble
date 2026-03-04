# Component Boundaries: Step-Level Card Refactoring

## Summary

Collapse board kanban from one card per file to one card per step. Files become a count displayed on the card (e.g., "3 files"). This reverses the expansion introduced in ADR-006.

## Rename Map

| Current | New | Location |
|---------|-----|----------|
| `FileCardData` (interface) | `StepCardData` | `board/src/utils/statusMapping.ts` |
| `expandStepToFileCards` (function) | `toStepCard` | `board/src/utils/statusMapping.ts` |
| `FileCard` (component) | `StepCard` | `board/src/components/StepCard.tsx` (rename file) |
| `FileCard.tsx` (file) | `StepCard.tsx` | `board/src/components/` |
| `FileCardProps` (interface) | `StepCardProps` | `board/src/components/StepCard.tsx` |
| `createFileCardData` (test fixture) | `createStepCardData` | `board/src/__tests__/acceptance/card-redesign/steps/test-fixtures.ts` |
| `groupFileCardsByColumn` (internal) | `groupStepCardsByColumn` | `board/src/components/LayerLane.tsx` |

## Component Changes

### `statusMapping.ts` -- Data Transformation

**Before**: `expandStepToFileCards(step, isBlocked)` returns `readonly FileCardData[]` -- one entry per file.

**After**: `toStepCard(step, isBlocked)` returns a single `StepCardData`. Pure function, no array expansion. The `files_to_modify` array is carried as `readonly string[]` on the card data so the component can derive count and tooltip content.

Key behavioral changes:
- Return type changes from `readonly FileCardData[]` to `StepCardData` (single object, not array)
- No fallback to step name when `files_to_modify` is empty -- `fileCount` is simply 0
- All other field mappings remain identical (`stepId`, `stepName`, `displayColumn`, `reviewCount`, `worktree`, `isBlocked`, `teammateId`)

### `StepCard.tsx` (was `FileCard.tsx`) -- Card Component

**Before**: Renders `filename` as muted subtitle below step name.

**After**: Renders file count as muted subtitle (e.g., "3 files", "1 file", "0 files"). The `filename` field is removed from the data model.

Card anatomy (top to bottom):
1. **Row 1**: Step name (left, `font-medium text-gray-100`) | Step ID (right, `font-mono text-xs text-gray-400`)
2. **Row 2**: File count as muted text (e.g., "3 files") -- same position/style as old filename subtitle
3. **Row 3** (conditional): Teammate indicator (person icon + colored label)
4. **Row 4** (conditional): Badge row (worktree, review count, blocked)

Other behaviors unchanged:
- `data-testid` changes from `file-card` to `step-card`
- `onCardClick` still fires with `stepId`
- Animation classes still derived from `displayColumn`
- Status-color border-left still derived from `displayColumn`

### `LayerLane.tsx` -- Card Layout

**Before**:
```
flatMap(step => expandStepToFileCards(step, ...))  // N steps -> M cards (M >= N)
key={`${card.stepId}-${card.filename}`}
```

**After**:
```
map(step => toStepCard(step, ...))  // N steps -> N cards (1:1)
key={card.stepId}
```

- Import changes: `StepCardData` replaces `FileCardData`, `toStepCard` replaces `expandStepToFileCards`, `StepCard` replaces `FileCard`
- `groupStepCardsByColumn` parameter type changes to `readonly StepCardData[]`
- Column count badge now reflects step count (not file count)

### `KanbanBoard.tsx` -- No Changes

KanbanBoard does not import FileCard or FileCardData. It delegates to LayerLane. No modifications needed.

### `StepDetailModal.tsx` -- No Changes

Uses `mapStatusToDisplayColumn` but not `FileCardData` or `FileCard`. No modifications needed.

## Test File Impact

| Test File | Change Required |
|-----------|----------------|
| `statusMapping.test.ts` | Rewrite `expandStepToFileCards` tests as `toStepCard` tests. Single-object assertions replace array assertions. Remove "one card per file" tests. Add `fileCount` / `files` field assertions. |
| `FileCard.test.tsx` | Rename to `StepCard.test.tsx`. Replace `FileCardData` with `StepCardData`. Replace filename subtitle assertions with file count assertions. Update `data-testid` from `file-card` to `step-card`. |
| `test-fixtures.ts` | Rename `createFileCardData` to `createStepCardData`. Replace `filename` required field with `fileCount` + `files`. Update type import. |
| `walking_skeleton.test.tsx` | Replace `FileCard` import with `StepCard`. Replace filename assertions with file count assertions. Update fixture calls. |
| `teammate_steps.test.tsx` | Replace `FileCard` import with `StepCard`. Remove multi-card-same-step scenarios (US-05 Scenario 2 collapses -- same teammate always shows once per step). Update fixture calls. |
| `card_layout_steps.test.tsx` | Replace `FileCard` import with `StepCard`. Scenario 4 (multiple cards from same step) no longer applies -- remove or rewrite as single-card-with-file-count test. Scenario 5 (conflict via filename subtitle) needs redesign -- conflict detection now through StepDetailModal, not card subtitle. |
| `modal_steps.test.tsx` | Comment references to `FileCard` updated to `StepCard`. No functional test changes (modal does not use card component). |

## Files Touched (Production)

1. `board/src/utils/statusMapping.ts` -- interface rename, function rewrite
2. `board/src/components/FileCard.tsx` -> `board/src/components/StepCard.tsx` -- component rename + UI change
3. `board/src/components/LayerLane.tsx` -- import updates, `flatMap` to `map`, key strategy

**Total: 3 production files**

# Architecture Design: Board UI Cleanup

## Context

Brownfield cleanup on existing board application (TypeScript + React + Vite frontend, Node.js server with WebSocket + HTTP). The codebase follows functional programming paradigm with pure core / IO adapter separation. Six user stories targeting noise reduction, filtering, and feature discovery extension.

## Decision Summary

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Delete ActivityFeed component and remove from BoardContent | Dead code removal; no other consumers of `transitions` in rendering |
| D2 | Remove `transitions` prop from BoardContent | Only consumer was ActivityFeed; `useRoadmapState` still collects transitions for WebSocket protocol but UI does not render them |
| D3 | Filter teammates in `deriveTeammates` pure function | Filtering belongs in pure core; component structure unchanged |
| D4 | US-03 may be a no-op -- verify first | Current StepCard already hides teammate when `teammateId === null`; condition `card.teammateId !== null` already covers done+unassigned |
| D5 | Remove review badge rendering from StepCard; keep `reviewCount` on `StepCardData` | Field needed by StepDetailModal via `RoadmapStep.review_attempts` |
| D6 | Add `review_history` optional field to `RoadmapStep` type | Backward compatible; parser defaults to undefined when absent |
| D7 | Extend `scanFeatureDirsFs` to scan 3 directories, union + deduplicate | Minimal change to IO adapter; pure core unchanged |

## Data Model Changes

### US-05: ReviewEntry type and RoadmapStep extension

Add to `board/shared/types.ts`:

```
RoadmapStep gains:
  review_history?: readonly ReviewEntry[]

ReviewEntry shape:
  cycle: number
  timestamp: string
  outcome: 'approved' | 'rejected'
  feedback: string
```

**Backward compatibility**: `review_history` is optional. Existing roadmaps without it parse without error. The parser (`board/server/parser.ts`) treats missing field as `undefined`. StepDetailModal falls back to `review_attempts` count when `review_history` is absent.

**Parser change** (`board/server/parser.ts`): `validateRoadmapStep` adds optional parsing of `review_history` array from YAML. Each entry validated for required fields. Invalid entries skipped (lenient parsing for forward compat).

### US-06: No FeatureSummary type changes needed

`deriveFeatureSummary` already handles `roadmap: null` gracefully -- returns `hasRoadmap: false`. The type is unchanged. Only the IO adapter (`scanFeatureDirsFs`) changes to scan additional directories.

## Feature Discovery Changes (US-06)

### Current State

```
scanFeatureDirsFs(projectPath)
  -> reads: docs/feature/
  -> returns: FeatureId[]
```

### Target State

```
scanFeatureDirsFs(projectPath)
  -> reads: docs/feature/, docs/ux/, docs/requirements/
  -> union + deduplicate by FeatureId
  -> returns: FeatureId[]
```

**Scan directories** (constant array):
- `docs/feature` (existing -- has roadmaps)
- `docs/ux` (new -- discuss-wave artifacts)
- `docs/requirements` (new -- discuss-wave artifacts)

**Deduplication**: A feature appearing in multiple directories produces one FeatureId. `Set` semantics on the branded string.

**Roadmap resolution unchanged**: `loadFeatureRoadmapFs` still looks in `docs/feature/{id}/roadmap.yaml` only. Features discovered from `docs/ux/` or `docs/requirements/` will have `roadmap: null` and `hasRoadmap: false` until a roadmap is created under `docs/feature/`.

## Integration Impact

### Files to Delete

| File | Reason |
|------|--------|
| `board/src/components/ActivityFeed.tsx` | US-01: component removed |
| `board/src/__tests__/ActivityFeed.test.tsx` | Tests for deleted component |

### Files to Modify

| File | Story | Change |
|------|-------|--------|
| `board/src/App.tsx` | US-01 | Remove ActivityFeed import, remove Activity section from BoardContent sidebar, remove `transitions` prop from BoardContent |
| `board/src/components/TeamPanel.tsx` | US-02 | Filter `deriveTeammates` output to exclude teammates with no active steps; change empty state text to "No active teammates" |
| `board/src/components/StepCard.tsx` | US-03 | Verify existing behavior -- `card.teammateId !== null` already hides indicator for null teammate. If already correct, no change needed |
| `board/src/components/StepCard.tsx` | US-04 | Remove review count badge rendering block |
| `board/shared/types.ts` | US-05 | Add `ReviewEntry` interface, add optional `review_history` to `RoadmapStep` |
| `board/server/parser.ts` | US-05 | Parse optional `review_history` array from YAML |
| `board/src/components/StepDetailModal.tsx` | US-05 | Add Review History section with fallback to count-only display |
| `board/server/feature-discovery.ts` | US-06 | Extend `scanFeatureDirsFs` to scan 3 directories with dedup |

### Files with Test Impact

| Test File | Story | Impact |
|-----------|-------|--------|
| `board/src/__tests__/App.test.tsx` | US-01 | Remove transitions references from test fixtures |
| `board/src/__tests__/TeamPanel.test.tsx` | US-02 | Add tests for active-only filtering and new empty state |
| `board/src/__tests__/StepCard.test.tsx` | US-03, US-04 | US-03: verify existing behavior; US-04: update badge tests |
| `board/src/__tests__/acceptance/card-redesign/steps/test-fixtures.ts` | US-04 | Update if review badge assertions exist |
| `board/server/__tests__/parse-roadmap.test.ts` | US-05 | Add tests for `review_history` parsing |
| `board/server/__tests__/feature-discovery-io.test.ts` | US-06 | Add tests for multi-directory scanning and dedup |

### Unchanged (Confirmed)

| File | Why Unchanged |
|------|---------------|
| `board/shared/types.ts` `RoadmapTransition` | WebSocket protocol unchanged; transitions still flow, just not rendered |
| `board/shared/types.ts` `ServerWSMessage` | Server protocol unchanged |
| `board/src/hooks/useRoadmapState.ts` | Still collects transitions for potential future use; no breaking change. Crafter may optionally remove `transitions` from return if no other consumers exist |
| `board/src/utils/statusMapping.ts` | `StepCardData.reviewCount` field stays (no schema change per US-04 AC) |
| `board/server/feature-path-resolver.ts` | Roadmap resolution path unchanged; only scan directories expand |

## Execution Order

```
US-06 (Feature Discovery)  --> First: unblocks seeing this feature on the board
US-01 (Remove Activity)    --\
US-04 (Remove Review Badge) --+--> Independent, batch as single step
US-02 (Active Teammates)   --/
US-03 (Clean Done Cards)   --> Verify-first: may be existing behavior (no-op)
US-05 (Review History)     --> Last: schema evolution + parser + UI
```

## Quality Attributes

| Attribute | Strategy |
|-----------|----------|
| Maintainability | Dead code deletion (ActivityFeed); reduce component surface area |
| Testability | Pure function changes (deriveTeammates filter, scanFeatureDirsFs) testable in isolation |
| Backward Compatibility | `review_history` optional; parser lenient; existing roadmaps unaffected |
| Simplicity | No new components for US-01/02/03/04; US-05 reuses existing DetailSection pattern; US-06 extends existing scan function |

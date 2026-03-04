# Component Boundaries: Board UI Cleanup

## Affected Components Map

```
board/
  shared/
    types.ts .................... US-05: +ReviewEntry, +review_history on RoadmapStep
  server/
    parser.ts ................... US-05: parse optional review_history
    feature-discovery.ts ........ US-06: multi-directory scan + dedup
  src/
    App.tsx ..................... US-01: remove Activity section + transitions prop
    components/
      ActivityFeed.tsx ......... US-01: DELETE
      TeamPanel.tsx ............ US-02: filter to active-only
      StepCard.tsx ............. US-03: verify existing behavior; US-04: remove review badge
      StepDetailModal.tsx ...... US-05: add Review History section
```

## Per-Story Component Analysis

### US-01: Remove Activity Section

**Boundary**: `App.tsx` > `BoardContent` component (internal to App.tsx)

- Remove `ActivityFeed` import from App.tsx
- Remove `<section aria-label="Activity">` block from BoardContent JSX (lines ~127-130)
- Remove `transitions` from `BoardContentProps` interface
- Remove `transitions` argument from both `BoardContent` call sites:
  - `BoardView`: `<BoardContent roadmap={roadmap} transitions={transitions} />`
  - `FeatureBoardView` (in App.tsx): `<BoardContent roadmap={roadmap} transitions={[]} />`
- Delete `board/src/components/ActivityFeed.tsx`
- Delete `board/src/__tests__/ActivityFeed.test.tsx`

**Not changed**: `useRoadmapState` still returns `transitions` (WebSocket protocol collects them). Crafter decides whether to remove unused return field.

### US-02: Active-Only Teammates Panel

**Boundary**: `TeamPanel.tsx` > `deriveTeammates` pure function

- Current: `deriveTeammates` returns ALL teammates (active + idle)
- Target: return only teammates where `currentStepName !== null` (has active step in claimed/in_progress/review)
- Empty state text: "No teammates" -> "No active teammates"

**Pure function change only**. Component structure, props, and rendering logic unchanged. The `ACTIVE_STATUSES` set already exists in this file.

### US-03: Clean Done Card Appearance

**Boundary**: `StepCard.tsx`

**Verification needed first**: The current rendering logic is:
```
{card.teammateId !== null && (
  <div data-testid="teammate-indicator">...</div>
)}
```

This already hides the teammate indicator when `teammateId` is `null`. The user story specifies hiding teammate on done cards when teammate is unassigned (null). The current code handles this case.

**Action**: Write a test confirming the behavior. If confirmed, US-03 is a no-op verification story. If the intent is to hide teammate on ALL done cards regardless of assignment, that changes the condition -- but the user story explicitly states "when tickets are done AND teammates are unassigned."

### US-04: Remove Review Badge from Cards

**Boundary**: `StepCard.tsx` > badge rendering block

- Remove: `{card.reviewCount > 0 && (<Badge ...>...</Badge>)}` block
- Keep: `Badge` component (used by worktree and blocked badges)
- Keep: `card.reviewCount` / `StepCardData.reviewCount` field (no schema change)
- Keep: `review_attempts` display in StepDetailModal timing section (confirmed in modal code line 152)

### US-05: Review History in Step Detail Modal

**Three boundaries**:

1. **Type layer** (`shared/types.ts`):
   - New `ReviewEntry` interface (readonly, immutable)
   - `RoadmapStep` gains optional `review_history?: readonly ReviewEntry[]`

2. **Parser layer** (`server/parser.ts`):
   - `validateRoadmapStep` gains optional parsing of `review_history` array
   - Each entry validated: `cycle` (number), `timestamp` (string), `outcome` ('approved'|'rejected'), `feedback` (string)
   - Invalid/missing entries: skip silently (lenient)
   - Missing `review_history` field: `undefined` (backward compatible)

3. **UI layer** (`StepDetailModal.tsx`):
   - New conditional section: when `step.review_history` is present and non-empty, render "Review History" section using existing `DetailSection` pattern
   - Entries ordered newest-first (highest cycle number first)
   - Each entry shows: cycle number, timestamp, outcome label, feedback text
   - Multi-line feedback preserves line breaks
   - Fallback: when `review_history` is absent, existing `review_attempts` count in timing section unchanged
   - When `review_attempts === 0` and no `review_history`: no review-related sections

### US-06: Discover Features from All Doc Directories

**Boundary**: `feature-discovery.ts` > `scanFeatureDirsFs` IO adapter

- Current: scans `docs/feature/` only (single `FEATURE_BASE` constant)
- Target: scans `['docs/feature', 'docs/ux', 'docs/requirements']`
- For each directory: read subdirectories, filter by `isFeatureDir`, collect FeatureIds
- Union all results, deduplicate by FeatureId value (Set semantics on branded string)
- Return deduplicated `FeatureId[]`

**Unchanged boundaries**:
- `loadFeatureRoadmapFs`: still resolves roadmap from `docs/feature/{id}/roadmap.yaml` only
- `resolveFeatureDir` / `resolveFeatureRoadmap` in `feature-path-resolver.ts`: unchanged
- `deriveFeatureSummary`: already handles `roadmap: null`
- `discoverFeaturesFs`: calls `scanFeatureDirsFs` (gets expanded list) then loads roadmaps (still from `docs/feature/` only)

**Result**: Features discovered from `docs/ux/` or `docs/requirements/` appear on board with `hasRoadmap: false` and `hasExecutionLog: false`. Users can see the feature exists and browse its docs, but no kanban board until a roadmap.yaml is created.

## Dependency Graph Between Stories

```
US-06 -----> independent (do first for board visibility)
US-01 -----> independent
US-02 -----> independent
US-03 -----> independent (verify-first)
US-04 -----> independent
US-05 -----> depends on: types.ts change (ReviewEntry)
             depends on: parser.ts change (review_history parsing)
```

No inter-story runtime dependencies. US-05 has internal layered dependencies (types -> parser -> UI) that must be implemented bottom-up.

## Paradigm Notes (Functional)

All changes align with existing FP patterns:

- **Pure core changes**: `deriveTeammates` filter (US-02), `ReviewEntry` type (US-05), `validateRoadmapStep` extension (US-05)
- **IO adapter changes**: `scanFeatureDirsFs` multi-directory scan (US-06)
- **Component changes**: JSX rendering only (US-01, US-03, US-04, US-05 modal section)
- No new state management, no new effects, no mutation
- Review history entries are readonly/immutable throughout the pipeline

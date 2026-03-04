# Shared Artifacts Registry: Board UI Cleanup

## Artifact Registry

### roadmap

- **Source of truth**: WebSocket `init`/`update` messages -> `useRoadmapState` hook; or HTTP `/api/projects/:id/features/:fid/roadmap` -> `useFeatureState` hook
- **Type**: `Roadmap` (defined in `board/shared/types.ts`)
- **Consumers**:
  - `KanbanBoard` -- renders phases and steps as kanban columns
  - `TeamPanel` -- derives teammate list from step assignments
  - `ProgressHeader` -- computes summary statistics
  - `BoardContent` -- orchestrates all sidebar and board components
- **Owner**: `board/shared/types.ts` (type) + server parser (data)
- **Integration risk**: LOW -- all consumers receive the same Roadmap object; changes to filtering are internal to each consumer
- **Validation**: All consumers receive the identical Roadmap reference from BoardContent props

### transitions

- **Source of truth**: WebSocket `update` messages -> `useRoadmapState` hook
- **Type**: `readonly RoadmapTransition[]`
- **Consumers**:
  - `ActivityFeed` -- **(BEING REMOVED by US-01)**
  - `BoardContent` -- passes to ActivityFeed **(reference to be removed)**
- **Owner**: `board/shared/types.ts` (type) + WebSocket protocol
- **Integration risk**: LOW -- removing the only consumer; WebSocket protocol unchanged
- **Validation**: After US-01, verify no component imports or renders ActivityFeed

### teammate_id (on RoadmapStep)

- **Source of truth**: `RoadmapStep.teammate_id` field in roadmap YAML
- **Type**: `string | null`
- **Consumers**:
  - `TeamPanel.deriveTeammates()` -- builds teammate list **(modified by US-02 to filter active only)**
  - `StepCard` -- shows teammate indicator **(modified by US-03 for done cards)**
  - `StepDetailModal` -- shows teammate in detail view (unchanged)
  - `toStepCard()` -- maps to `StepCardData.teammateId`
- **Owner**: Roadmap YAML schema
- **Integration risk**: MEDIUM -- US-02 and US-03 both change how teammate_id is interpreted for display. Must ensure consistent definition of "active" (claimed, in_progress, review).
- **Validation**: Both US-02 and US-03 use the same ACTIVE_STATUSES set for consistency

### review_attempts (on RoadmapStep)

- **Source of truth**: `RoadmapStep.review_attempts` field in roadmap YAML
- **Type**: `number`
- **Consumers**:
  - `StepCard` via `StepCardData.reviewCount` -- renders review badge **(REMOVED by US-04)**
  - `StepDetailModal` -- shows count in timing section (unchanged initially; enhanced by US-05)
  - `toStepCard()` -- maps to `StepCardData.reviewCount` (field remains, badge removed)
- **Owner**: Roadmap YAML schema
- **Integration risk**: LOW -- removing badge display does not affect data flow
- **Validation**: After US-04, verify no badge rendering code references reviewCount in StepCard

### review_history (NEW -- required by US-05)

- **Source of truth**: New field on RoadmapStep or roadmap YAML (schema TBD)
- **Type**: TBD -- likely `readonly ReviewEntry[]` where `ReviewEntry = { cycle: number; timestamp: string; outcome: 'approved' | 'rejected'; feedback: string }`
- **Consumers**:
  - `StepDetailModal` -- renders Review History section **(NEW in US-05)**
- **Owner**: Roadmap YAML schema (requires schema evolution)
- **Integration risk**: HIGH -- new data structure requires:
  1. Type definition in `board/shared/types.ts`
  2. YAML parser update in `board/server/parser.ts`
  3. Backward compatibility for roadmaps without review_history
- **Validation**: Parser must handle missing review_history field gracefully; modal must fall back to count display

### ACTIVE_STATUSES constant

- **Source of truth**: Defined in `TeamPanel.tsx` as `new Set(['claimed', 'in_progress', 'review'])`
- **Also defined in**: `board/shared/types.ts` as `IN_PROGRESS_STATUSES` (same set)
- **Consumers**:
  - `TeamPanel.deriveTeammates()` -- determines if teammate is active
  - `computeRoadmapSummary()` -- counts in-progress steps
- **Owner**: Should be a single shared constant
- **Integration risk**: MEDIUM -- duplicate definitions could diverge
- **Validation**: US-02 should reference the shared constant from types.ts rather than maintaining a local copy

---

## Integration Checkpoints

### Checkpoint 1: Sidebar Layout (US-01 + US-02)

After removing Activity and filtering teammates:
- Sidebar contains only Teammates section
- Teammates section shows only active teammates
- If no active teammates, shows meaningful empty state
- Sidebar does not have excessive empty space

### Checkpoint 2: Card Display Consistency (US-03 + US-04)

After cleaning done cards and removing review badges:
- Active cards (pending, in_progress, review columns) show: name, ID, files, teammate, blocked/worktree badges
- Done cards with unassigned teammate show: name, ID, files, blocked/worktree badges (no teammate, no review)
- Done cards with assigned teammate show: name, ID, files, teammate, blocked/worktree badges (no review)

### Checkpoint 3: Modal Completeness (US-04 + US-05)

After removing card badge and adding modal history:
- Review information is accessible ONLY through the step detail modal
- Modal shows review history when data exists
- Modal falls back to count when only review_attempts is available
- No loss of review information from the user's perspective

### Checkpoint 4: Data Flow Integrity (All US)

- Roadmap data flows unchanged from server to client
- All display changes are in rendering logic only
- No mutations to shared data structures
- WebSocket protocol unchanged

---

## Coherence Validation

### CLI/UI Vocabulary Consistency

| Term | Usage |
|------|-------|
| Teammates | Sidebar section heading, panel component name |
| Active | Status qualifier for teammates (claimed, in_progress, review) |
| Done | Display column name for approved steps |
| Review | Display column name AND review history concept -- context disambiguates |
| Review History | New section in StepDetailModal |
| Review attempts | Legacy count display (fallback) |

### Emotional Arc Coherence

| Stage | Emotion | Supporting Change |
|-------|---------|-------------------|
| Open board | Focused | Activity noise removed (US-01) |
| Check sidebar | Confident | Only active teammates shown (US-02) |
| Scan kanban | Clear | Done cards clean, no review badges (US-03, US-04) |
| Click card | Informed | Review history provides full context (US-05) |

No jarring transitions. Each change reduces cognitive load progressively. The most informative change (review history) is behind progressive disclosure (click to open modal).

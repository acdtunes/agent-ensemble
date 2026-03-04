# Requirements: Conflict Detection

## Feature Overview

Surface existing conflict detection in the kanban board UI. The CLI (`team_state.py`) already computes file conflicts and creates worktrees automatically via `start-step`. This feature extends the CLI to write conflict metadata, then displays it in the board.

## Existing Infrastructure

The CLI already provides:
- `_detect_file_conflicts(step, active_steps)` — Computes file overlaps
- `_get_active_steps(data)` — Gets steps with `in_progress` or `review` status
- `worktree` field in `roadmap.yaml` — Set when worktree was created for a step

## Functional Requirements

### FR-1: CLI Writes Conflict Data

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | `start-step` shall write `conflicts_with: [step-ids]` to roadmap.yaml | Must |
| FR-1.2 | `conflicts_with` shall list IDs of steps sharing files | Must |
| FR-1.3 | Field shall be cleared when step completes (approved) | Should |

### FR-2: Conflict Badge Display

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Cards shall display `conflicts: N` badge when N > 0 | Must |
| FR-2.2 | Cards shall display `needs worktree` badge when conflicting with in_progress work | Must |
| FR-2.3 | Badges shall be hidden when card has no active conflicts | Must |
| FR-2.4 | Badge color shall be amber/warning tone | Should |

### FR-3: Conflict Investigation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Hovering over card shall show list of conflicting step IDs | Should |
| FR-3.2 | Clicking card shall highlight conflicting cards on the board | Could |
| FR-3.3 | Conflict details shall list shared files | Could |

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Constraint |
|----|-------------|------------|
| NFR-1.1 | Conflict calculation shall complete in < 50ms for 100 steps | Target |
| NFR-1.2 | Conflict map shall be memoized to prevent recalculation on every render | Must |

### NFR-2: Usability

| ID | Requirement | Constraint |
|----|-------------|------------|
| NFR-2.1 | Conflict indicators shall be visible without user action | Must |
| NFR-2.2 | Badge text shall be readable at normal card size | Must |

## Out of Scope

- Automatic worktree creation (already handled by CLI `start-step`)
- Conflict resolution suggestions
- Dependency-based conflict analysis (only file-based)
- Historical conflict tracking after completion

## Constraints

- Must use existing `RoadmapStep.files_to_modify` data
- Must integrate with existing `StepCard` component (which already has `worktree` and `isBlocked` props)
- Must work with WebSocket-based real-time updates
- Should mirror CLI logic in `_detect_file_conflicts()` for consistency

## Technical Notes

### CLI Changes (`src/agent_ensemble/cli/team_state.py`)
- In `cmd_start_step`: write `conflicts_with` field with list of conflicting step IDs
- In `cmd_complete_step`: optionally clear `conflicts_with` from completed step

### Type Changes (`board/shared/types.ts`)
- Add to `RoadmapStep`: `worktree?: string` and `conflicts_with?: readonly string[]`

### Board Changes
- `expandStepToStepCard`: read `worktree` (truthy) instead of hardcoding `false`
- Add `conflictsWith: readonly string[]` to `StepCardData`
- `StepCard`: display conflict count badge and list from props (no computation)

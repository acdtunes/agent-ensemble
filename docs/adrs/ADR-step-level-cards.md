# ADR-010: Step-Level Card Granularity

## Status

Accepted (supersedes ADR-006)

## Context

ADR-006 introduced file-level card granularity: each step with N files in `files_to_modify` renders N `FileCard` components. The rationale was that file-level conflicts (two steps modifying the same file) become self-evident through visual pattern recognition -- the same filename appears on multiple cards.

In practice, the file-level expansion creates problems:

1. **Card proliferation**: A step touching 5 files produces 5 visually near-identical cards (same step name, same status, same badges). A layer with 8 steps averaging 3 files shows 24 cards. The board becomes difficult to scan.
2. **Step identity dilution**: The primary unit of work in the delivery model is the step, not the file. Multiple cards per step fragment a single unit of work across the board, making progress tracking harder.
3. **Redundant information**: All cards from the same step share step name, step ID, status, teammate, badges. Only the filename subtitle differs. The signal-to-noise ratio is low.
4. **Conflict detection moved to modal**: `StepDetailModal` already shows the full file list and conflict information for any step. The card subtitle is no longer the primary conflict detection mechanism.

## Decision

Replace file-level cards with step-level cards. Each `StepState` produces exactly one `StepCard`. The card shows a file count ("3 files") as subtitle instead of a filename. Full file list is available via tooltip or the existing `StepDetailModal`.

Rename chain: `FileCardData` -> `StepCardData`, `expandStepToFileCards` -> `toStepCard`, `FileCard` -> `StepCard`.

The transformation function returns a single object instead of an array. `files_to_modify` is carried on the card data as `readonly string[]` for tooltip rendering and modal passthrough.

## Alternatives Considered

### Alternative 1: Keep file-level cards with collapsing/grouping

- **What**: Visually group cards from the same step (shared border, collapse toggle). Default collapsed showing "Step X (3 files)", expand to show individual file cards.
- **Expected impact**: Solves card proliferation when collapsed. Preserves file-level conflict detection when expanded.
- **Why rejected**: Adds UI complexity (collapse/expand state, grouped rendering, animation) for marginal benefit over step-level cards + modal. The collapsed state is functionally identical to a step-level card. The expanded state duplicates what `StepDetailModal` already provides.

### Alternative 2: Keep file-level cards with reduced card size

- **What**: Make file cards much smaller (filename only, no badges, single line). Rely on density to reduce visual clutter.
- **Expected impact**: Fits more cards per column. Still shows filenames for conflict spotting.
- **Why rejected**: Removes badge visibility (worktree, review count, blocked, teammate) which are important status signals. Compact cards become unreadable at scale. Does not address the fundamental issue that the unit of tracking (step) does not match the unit of rendering (file).

## Consequences

- **Positive**: Card count equals step count (predictable, typically 5-15 per layer). Each card represents one trackable unit of work. Board is scannable at a glance. No redundant information across cards.
- **Positive**: Simpler data transformation -- `toStepCard` returns a single object, no array expansion. `LayerLane` uses `map` instead of `flatMap`.
- **Negative**: File-level conflict detection is no longer visible at the card level. Users must click a card to see files in the modal. Mitigated by: modal already exists and displays file list and conflicts.
- **Negative**: The `filename` field and per-file rendering path are removed. If file-level visibility is needed in the future, it would require adding a tooltip or expandable section to `StepCard`.

## Supersedes

ADR-006: File-Level Card Granularity (status changed to Superseded)

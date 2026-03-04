# ADR-001: File Watching as Data Source for Kanban Board

## Status

Accepted

## Context

The kanban board needs real-time data about the delivery process to display step statuses, teammate assignments, and state transitions. The delivery process is orchestrated by Claude Code Agent Teams, which invokes CLI tools (`team_state.py`) that write state to `.nw-teams/state.yaml`.

We need to choose how the kanban board obtains this data.

## Options Considered

### Option A: Watch state.yaml (file system)

The server watches `.nw-teams/state.yaml` using `chokidar` and parses the YAML on each change. The board receives state snapshots via WebSocket.

- (+) Zero modifications to existing CLI tools
- (+) Board is fully decoupled from delivery runtime
- (+) Single source of truth — no synchronization issues
- (+) Board can be started/stopped without affecting delivery
- (-) Snapshot-based — misses intermediate states if multiple transitions happen within the debounce window
- (-) Requires debouncing to avoid partial YAML reads

### Option B: Event emission from CLI tools

Modify `team_state.py` to emit structured events (e.g., JSON lines to a file, or to a Unix socket) that the board consumes.

- (+) Fine-grained transition events, no missed states
- (+) Lower parsing overhead (structured events vs full YAML parse)
- (-) Requires modifying existing CLI tools — coupling risk
- (-) Event log management (rotation, cleanup)
- (-) Two sources of truth (state.yaml + event log) that could diverge

### Option C: Shared SQLite database

Replace state.yaml with SQLite. Both CLI tools and board read/write the same database.

- (+) Structured queries, transactional writes
- (+) Could support historical queries
- (-) Major refactor of existing CLI tools (YAML → SQLite migration)
- (-) Adds dependency to Python CLI tools
- (-) Overkill for the data volume (< 50 records)

## Decision

**Option A: Watch state.yaml.**

## Consequences

- The board server uses `chokidar` to watch `.nw-teams/state.yaml` with a 100ms debounce
- On each change, it parses the full YAML and diffs against the previous state to derive transitions
- Transitions that occur faster than 100ms apart will be collapsed into a single update (acceptable for this use case — CLI writes are seconds apart)
- No changes to `team_state.py`, `parallel_groups.py`, or `worktree.py`
- The board can be developed and tested independently by placing sample state.yaml files

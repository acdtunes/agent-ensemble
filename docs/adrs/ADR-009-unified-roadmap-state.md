# ADR-009: Unified Roadmap State -- Single Source of Truth

## Status

Proposed

## Context

The NW-Teams delivery execution system tracks feature progress using three separate files per feature:

1. **roadmap.yaml** -- the plan (phases, steps, criteria, dependencies, files_to_modify)
2. **execution-log.yaml** -- audit trail of DES execution events (PREPARE, RED, GREEN, COMMIT per step)
3. **state.yaml** -- step statuses, teammate tracking, summary counts (generated from plan.yaml by `team_state.py init`)

Additionally, `parallel_groups.py` generates an intermediate `plan.yaml` from `roadmap.yaml` for execution layer analysis.

This 3-file architecture creates several problems:

- **Data synchronization**: step counts and statuses must be kept consistent across state.yaml and execution-log.yaml. The summary counts in state.yaml are manually incremented/decremented -- a bug source.
- **Initialization ceremony**: `team_state.py init --plan plan.yaml --output state.yaml` must be run before any step can be tracked. The roadmap already contains all the information.
- **Parser proliferation**: 6 parser functions to read 3 file formats, producing 2 separate type models (`ExecutionPlan` + `DeliveryState`) that must be joined at consumption time.
- **Endpoint duplication**: the board server exposes separate `/plan` and `/state` endpoints per feature. The frontend fetches both and merges them.
- **Indirection**: a developer updates state.yaml, but the ground truth (what needs to be done) lives in roadmap.yaml. Status lives in a different file than the plan it describes.

Team size is 1 developer. Timeline is immediate. This is internal tooling -- no external API consumers.

## Decision

Make `roadmap.yaml` the single source of truth for both the plan and step execution status. Add optional `status`, `teammate_id`, `started_at`, `completed_at`, and `review_attempts` fields to each step in the roadmap. Absent fields default to pending/null/0.

Summary counts (completed, failed, in_progress) are computed at read time by counting step statuses -- never stored.

The CLI writes status updates directly to `roadmap.yaml`. The board server reads only `roadmap.yaml` for both plan structure and execution state. `execution-log.yaml` remains as an optional audit trail but the board never reads it for status information.

## Alternatives Considered

### Alternative 1: Keep 3 files, add automated sync

- **What**: Add a watcher that regenerates state.yaml when execution-log.yaml changes.
- **Expected impact**: Eliminates manual init step, but keeps 3 files and all parsers.
- **Why insufficient**: Adds complexity (watcher + regeneration logic) without reducing the fundamental problem of split state. Still 6 parsers, 2 type models, 2 endpoints. Adds a new failure mode (sync watcher crashes).

### Alternative 2: Merge state.yaml into execution-log.yaml only

- **What**: Derive step statuses from execution-log events. Eliminate state.yaml but keep plan separate.
- **Expected impact**: Reduces to 2 files. Eliminates init command and state sync.
- **Why insufficient**: Still requires 2 separate parsers and endpoints. The execution-log format (event-based) requires stateful reduction to derive current status -- more complex than storing status directly. Every board read requires replaying the entire event log.

### Alternative 3: Database-backed state

- **What**: Replace YAML files with SQLite for state tracking.
- **Expected impact**: Eliminates file sync issues. Enables complex queries.
- **Why insufficient**: Massive overengineering for a 1-developer project. Introduces a new dependency (SQLite). Breaks the file-based workflow that makes roadmaps portable and version-controllable. Roadmap.yaml would still exist for the plan, creating the same split.

## Consequences

### Positive

- **1 file, 1 parser, 1 endpoint** per feature -- dramatically simpler mental model
- **No init command** -- roadmap is the initial state (absent status = pending)
- **No summary sync bugs** -- counts computed at read time from step statuses
- **Fewer types** -- single `Roadmap` model replaces `ExecutionPlan` + `DeliveryState` join
- **Roadmap is self-documenting** -- `git log roadmap.yaml` shows both plan evolution and execution progress
- **Backward compatible** -- existing roadmaps work without modification (missing status = pending)

### Negative

- **Larger roadmap.yaml** -- each step gains ~5 optional fields (negligible for files with 8-20 steps)
- **YAML round-trip fidelity** -- CLI must preserve comments/formatting when writing back. Requires `ruamel.yaml` (MIT) instead of `pyyaml`
- **Migration period** -- bridge functions needed to support old `ExecutionPlan`/`DeliveryState` consumers during incremental migration
- **No separation of plan vs execution data** -- plan author and executor write to the same file. Acceptable for 1-developer team; would need access controls for larger teams.
- **Execution-log audit trail** -- developers who want full event-level audit (PREPARE, RED, GREEN, COMMIT phases) still need execution-log.yaml. This design does not eliminate it, just stops the board from depending on it for status.
- **Concurrent file access** -- CLI and board server may read/write roadmap.yaml simultaneously. Mitigated by: CLI uses atomic write (write to temp file + rename), chokidar's 100ms debounce skips mid-write reads. Single-developer workflow makes true concurrent writes unlikely.

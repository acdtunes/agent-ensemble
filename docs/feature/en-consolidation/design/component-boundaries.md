# EN Consolidation -- Component Boundaries

## Boundary Overview

Six distinct component groups with strict ownership and dependency rules.

```
                    GENERATED (sync script output)
    ┌──────────────────────────────────────────────┐
    │  commands/    agents/    skills/    src/des/  │
    └──────────────────────────────────────────────┘
                         |
                         | references / imports
                         v
                  PROJECT-SPECIFIC
    ┌──────────────────────────────────────────────┐
    │  src/en/     commands/deliver.md              │
    └──────────────────────────────────────────────┘
                         ^
                         | reads
                         |
                    PRISTINE VENDOR
    ┌──────────────────────────────────────────────┐
    │  nwave/    nwave/VERSION                      │
    └──────────────────────────────────────────────┘
                         ^
                         | fetches + writes VERSION
                         |
                    TOOLING
    ┌──────────────────────────────────────────────┐
    │  scripts/sync-nwave.sh                        │
    └──────────────────────────────────────────────┘

                    CONSUMER SETUP
    ┌──────────────────────────────────────────────┐
    │  install.sh                                   │
    │  (Python deps, settings, cleanup, board UI)   │
    └──────────────────────────────────────────────┘
```

## Component 1: nwave/ (Pristine Vendor)

- **Responsibility**: Single source of truth for upstream nWave content
- **Contents**: `commands/`, `agents/`, `skills/`, `scripts/des/`, `scripts/templates/`, `VERSION`
- **Rules**: NEVER edited manually. Updated only by sync script or manual git operations.
- **Ownership**: Upstream (nWave-ai/nWave)
- **VERSION file**: Written by `sync-nwave.sh` with upstream tag, commit SHA, and sync timestamp. Committed to git for auditability.

## Component 2: scripts/sync-nwave.sh (Sync Tooling)

- **Responsibility**: Transform `nwave/` into project-local generated files and track upstream version
- **Inputs**: `nwave/` directory contents, upstream tag/commit (via `gh`)
- **Outputs**: `commands/`, `agents/`, `skills/`, `src/des/`, `nwave/VERSION`
- **Rules**: Idempotent. Respects override list (deliver.md). Reports changes. Supports `--dry-run`. Writes VERSION on every sync.
- **Ownership**: Project-specific

## Component 3: Generated Files (commands/, agents/, skills/, src/des/)

- **Responsibility**: Project-local copies of upstream content with en- prefix and local paths
- **Rules**: Overwritten by sync script (except overrides). Committed to git for reproducibility.
- **Dependency**: agents/ reference skills/ by relative path. commands/ reference en-* agent types.

### commands/ Boundary
- Generated from `nwave/commands/` with content transforms
- Exception: `deliver.md` is a project override, never overwritten
- Slash commands use `/en:` prefix
- Reference `en-*` agent types and `src/` PYTHONPATH

### agents/ Boundary
- Generated from `nwave/agents/` with file rename (nw-*.md -> en-*.md) and content transforms
- All `model: inherit` replaced with `model: claude-opus-4-6`
- Skill paths point to `skills/` relative to project root
- Reference `en-*` subagent types

### skills/ Boundary
- Copied from `nwave/skills/` without content transformation
- Directory structure mirrors upstream exactly
- Referenced by agents via relative paths

### src/des/ Boundary
- Copied from `nwave/scripts/des/` without transformation
- CLI modules invoked via `PYTHONPATH=src python -m des.cli.*`
- NEVER imports from `en/` -- dependency is one-way only
- Provides: roadmap scaffolding, TDD phase logging, integrity verification

## Component 4: src/en/ (Project-Specific Orchestration)

- **Responsibility**: Team orchestration, scheduling, worktree management
- **Renamed from**: `src/agent_ensemble/`
- **Rules**: NOT synced from upstream. Project-specific code. FP paradigm.

### Module Boundaries

| Module | Responsibility | Imports From |
|---|---|---|
| `cli/team_state.py` | Workflow state machine + `next-steps` scheduling | `en.adapters.roadmap_adapter`, `en.cli.parallel_groups` (Kahn's reuse) |
| `cli/parallel_groups.py` | Dependency graph analysis, topological layers | `en.adapters.roadmap_adapter` |
| `cli/worktree.py` | Git worktree CRUD, merge, cleanup | None (calls git subprocess) |
| `cli/migrate_roadmap.py` | Format migration (YAML<->JSON) | `en.adapters.roadmap_adapter`, `en.adapters.execlog_adapter` |
| `adapters/roadmap_adapter.py` | Format-agnostic roadmap I/O | `ruamel.yaml`, `json` (stdlib) |
| `adapters/execlog_adapter.py` | Format-agnostic execution log I/O | `ruamel.yaml`, `json` (stdlib) |

### next-steps Command (New)

Added to `team_state.py`. Computes spawnable steps incrementally.

- **Input**: Roadmap file path
- **Algorithm**: Read step statuses + deps from roadmap. Apply Kahn's logic: step is READY when all deps have `approved` status AND step itself is `pending`. Detect file conflicts with currently active steps.
- **Output**: List of ready step IDs with conflict annotations
- **Reuses**: `extract_steps` and `topological_layers` from `parallel_groups.py` (or equivalent pure functions). `_detect_file_conflicts` from `team_state.py`.
- **Key difference from `parallel_groups analyze`**: `parallel_groups` computes all layers upfront. `next-steps` computes incrementally based on current status, called after each step completion.

## Component 5: commands/deliver.md (Project Override)

- **Responsibility**: Define `/en:deliver` workflow combining parallel execution + DES tracking
- **Rules**: Never overwritten by sync script. Maintained manually.
- **References**: `en.cli.team_state next-steps`, `en.cli.team_state start-step/transition/complete-step`, `des.cli.*` for TDD tracking

## Component 6: install.sh (Consumer Setup)

- **Responsibility**: One-command setup for external consumers after cloning
- **Steps**:
  1. Clean up old global installations (`~/.claude/commands/ensemble/`, `~/.claude/lib/python/agent_ensemble/`, manifest)
  2. Install Python dependencies via `uv pip install -e .` (fallback: `pip install -e .`)
  3. Auto-configure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` (safe merge)
  4. Install board UI dependencies (`npm install` in `board/`)
  5. Print summary of available `/en:*` commands
- **Rules**: Idempotent. Never fails on missing npm (warns and continues). Merges settings without overwriting existing values.
- **Ownership**: Project-specific
- **Does NOT**: Install nWave globally, copy files to `~/.claude/`, write a manifest, require `--nwave-version`

## Dependency Rules

1. `en/` MAY import `des/` (for roadmap types/validation)
2. `des/` NEVER imports `en/`
3. `commands/` reference both `en.cli.*` and `des.cli.*` via shell invocations
4. `agents/` reference `skills/` via relative paths
5. `nwave/` is read-only input to `scripts/sync-nwave.sh`
6. No circular dependencies between CLI modules (team_state -> parallel_groups is one-way)

## FP Constraints on src/en/

- Pure functions for all scheduling logic (Kahn's algorithm, conflict detection, status filtering)
- Effect boundary at CLI entry points only (file I/O, git subprocess calls)
- Immutable domain values: `Step`, `ParallelGroup` as NamedTuples (already implemented)
- State changes produce new roadmap dicts, saved atomically by adapters
- No class hierarchies, no mutable state objects

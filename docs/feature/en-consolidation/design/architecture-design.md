# EN Consolidation -- Architecture Design

## System Context

The EN framework consolidates two previously separate systems -- nWave (global plugin) and Agent Ensemble (project-local) -- into a single self-contained project. The system enables parallel feature delivery using Claude Code Agent Teams with deterministic scheduling and TDD compliance tracking.

### Actors and External Systems

- **Developer**: Invokes `/en:*` slash commands in Claude Code
- **Claude Code**: Host environment providing Agent Teams, tool execution, slash command resolution
- **nWave Upstream**: Source repository at github.com/nWave-ai/nWave for periodic sync
- **Git**: Worktree management for parallel crafter isolation

## C4 System Context (L1)

```mermaid
C4Context
    title EN Framework -- System Context

    Person(dev, "Developer", "Invokes /en:* commands in Claude Code")
    System(en, "EN Framework", "Parallel feature delivery with deterministic scheduling and TDD tracking")
    System_Ext(claude, "Claude Code", "LLM host: Agent Teams, tool execution, slash command resolution")
    System_Ext(nwave_upstream, "nWave Upstream", "github.com/nWave-ai/nWave -- source for commands, agents, skills, DES")
    System_Ext(git, "Git", "Version control, worktree isolation for parallel crafters")
    System_Ext(npm, "npm", "Node.js package manager for board UI dependencies")

    Rel(dev, en, "Invokes /en:deliver, /en:execute, /en:design, etc.")
    Rel(dev, en, "Runs ./install.sh for initial setup")
    Rel(en, claude, "Runs within Claude Code as commands, agents, skills")
    Rel(nwave_upstream, en, "Syncs via scripts/sync-nwave.sh")
    Rel(en, git, "Creates/merges worktrees for parallel execution")
```

## C4 Container (L2)

```mermaid
C4Container
    title EN Framework -- Container Diagram

    Person(dev, "Developer")

    System_Boundary(en_system, "EN Framework") {
        Container(commands, "commands/", "Markdown", "Slash command definitions (/en:*). Generated from nwave/ except deliver.md (project override)")
        Container(agents, "agents/", "Markdown", "Agent system prompts (en-*). Generated from nwave/ with prefix rename and explicit model ID")
        Container(skills, "skills/", "Markdown", "Agent knowledge files. Copied from nwave/ unchanged")
        Container(en_pkg, "src/en/", "Python 3.11+", "Team orchestration CLIs: team_state, parallel_groups, worktree, migrate_roadmap, adapters")
        Container(des_pkg, "src/des/", "Python 3.11+", "DES TDD tracking CLIs: roadmap, init_log, log_phase, verify_deliver_integrity")
        Container(nwave, "nwave/", "Vendor", "Pristine upstream copy with VERSION file. NEVER edited manually. Source for sync script")
        Container(sync, "scripts/sync-nwave.sh", "Bash", "Transforms nwave/ into commands/, agents/, skills/, src/des/ with nw->en rename. Writes nwave/VERSION")
        Container(install, "install.sh", "Bash", "Consumer setup: Python deps (uv/pip), Claude Code settings, old install cleanup, board UI")
    }

    Rel(dev, install, "Runs once after clone")
    Rel(install, en_pkg, "pip install -e . (editable install)")
    Rel(dev, commands, "Invokes /en:deliver, /en:execute")
    Rel(commands, agents, "References en-* agent types")
    Rel(agents, skills, "Loads knowledge from skills/")
    Rel(commands, en_pkg, "Calls python -m en.cli.* for orchestration")
    Rel(commands, des_pkg, "Calls python -m des.cli.* for TDD tracking")
    Rel(en_pkg, des_pkg, "Imports for roadmap operations (one-way)")
    Rel(sync, nwave, "Reads pristine upstream")
    Rel(sync, commands, "Generates with nw->en rename")
    Rel(sync, agents, "Generates with nw->en rename + model fix")
    Rel(sync, skills, "Copies unchanged")
    Rel(sync, des_pkg, "Copies unchanged")
```

## C4 Component (L3) -- src/en/ Package

The `src/en/` package has 6 modules with clear responsibilities. This warrants L3 detail.

```mermaid
C4Component
    title src/en/ -- Component Diagram

    Container_Boundary(en_pkg, "src/en/") {
        Component(team_state, "team_state", "Python CLI", "Workflow state machine: start-step, transition, complete-step, next-steps, show, check")
        Component(parallel_groups, "parallel_groups", "Python CLI", "Dependency analysis: Kahn's algorithm, topological layers, file conflict detection")
        Component(worktree, "worktree", "Python CLI", "Git worktree lifecycle: create, list, merge, merge-all, cleanup, status")
        Component(migrate_roadmap, "migrate_roadmap", "Python CLI", "Roadmap format migration: Style A->B, YAML->JSON")
        Component(roadmap_adapter, "roadmap_adapter", "Python module", "Format-agnostic roadmap I/O: load, save, detect, migrate (YAML/JSON)")
        Component(execlog_adapter, "execlog_adapter", "Python module", "Format-agnostic execution log I/O: load, save, detect, migrate (YAML/JSON)")
    }

    Rel(team_state, roadmap_adapter, "Loads/saves roadmap state")
    Rel(team_state, worktree, "Creates/merges worktrees on start-step/complete-step")
    Rel(team_state, parallel_groups, "Reuses Kahn's algorithm for next-steps computation")
    Rel(parallel_groups, roadmap_adapter, "Loads roadmap for analysis")
    Rel(migrate_roadmap, roadmap_adapter, "Uses for format conversion")
    Rel(migrate_roadmap, execlog_adapter, "Uses for format conversion")
```

## Data Flow: en:deliver Execution

```mermaid
flowchart TD
    A["/en:deliver feature-id"] --> B{Roadmap exists?}
    B -->|No| C[Spawn en-solution-architect]
    C --> D[des.cli.roadmap init + fill TODOs]
    D --> E[Validate schema + descriptions]
    B -->|Yes| E
    E --> F[des.cli.init_log -- init execution log]
    F --> G["en.cli.team_state next-steps"]
    G --> H{Steps returned?}
    H -->|Yes| I[start-step for each returned step]
    I --> J[Spawn crafter per step]
    J --> K[Crafter runs TDD + des.cli.log_phase]
    K --> L[Reviewer approval]
    L --> M[complete-step -- merge worktree]
    M --> G
    H -->|No / DONE| N[des.cli.verify_deliver_integrity]
    N --> O[Integration smoke test]
    O --> P[L1-L4 refactoring pass]
    P --> Q[Mutation testing]
    Q --> R[Archive + cleanup + report]
```

## Dependency Direction

```
commands/ --> agents/ --> skills/
    |             |
    v             v
src/en/  ------> src/des/
(imports)    (NEVER imports en/)
```

`en/` depends on `des/` (for roadmap schema types). `des/` NEVER imports `en/`. This ensures the DES fork remains sync-able with upstream without entangling project-specific orchestration logic.

## Sync Architecture

```
nwave/                          (pristine upstream, git-tracked, includes VERSION)
    |
    | scripts/sync-nwave.sh
    |   Version tracking:
    |     Writes nwave/VERSION (tag, commit SHA, sync timestamp)
    |   Content transforms:
    |     /nw: --> /en:
    |     nw- --> en- (agent names)
    |     ~/.claude/skills/nw/ --> skills/
    |     ~/.claude/commands/nw/ --> commands/
    |     $HOME/.claude/lib/python --> src
    |     model: inherit --> model: claude-opus-4-6
    |   File renames:
    |     nw-*.md --> en-*.md (agents only)
    |   Override protection:
    |     commands/deliver.md NEVER overwritten
    |
    +--> commands/    (generated)
    +--> agents/      (generated, renamed)
    +--> skills/      (copied)
    +--> src/des/     (copied)
    +--> nwave/VERSION (tag + commit SHA + timestamp)

install.sh                      (consumer setup, run once after clone)
    |
    | Steps:
    |   1. Clean up old ~/.claude/ installations
    |   2. uv pip install -e . (or pip fallback) -- Python deps + editable install
    |   3. Auto-configure CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS in ~/.claude/settings.json
    |   4. npm install in board/ -- dashboard UI
    |   5. Print summary of available /en:* commands
```

## Requirements Traceability

| User Story | Component(s) | ADR |
|---|---|---|
| US-01: Populate nwave/ | nwave/ (vendor directory) | ADR-017 |
| US-02: Rename package | src/en/ (from agent_ensemble) | ADR-018 |
| US-03: Generate commands/ | commands/, scripts/sync-nwave.sh | ADR-017, ADR-018 |
| US-03b: Generate agents/ | agents/, scripts/sync-nwave.sh | ADR-017, ADR-018 |
| US-03c: Generate skills/ | skills/, scripts/sync-nwave.sh | ADR-017 |
| US-04: Delete old commands | commands/ (cleanup) | -- |
| US-05: Rewrite en:deliver | commands/deliver.md (override) | ADR-019 |
| US-05b: Add next-steps CLI | src/en/cli/team_state.py | ADR-019 |
| US-06: Update PYTHONPATH | commands/, agents/ (content transforms) | ADR-017 |
| US-07: Sync script | scripts/sync-nwave.sh, nwave/VERSION | ADR-017 |
| US-08: Install script | install.sh, ~/.claude/settings.json | -- |

## Quality Attribute Strategies

| Quality Attribute | Strategy |
|---|---|
| **Maintainability** | Vendor sync from upstream via `nwave/` + idempotent sync script. Single package rename (`en/`). Clear dependency direction. |
| **Testability** | Pure functions for scheduling (Kahn's algorithm). Adapters isolate I/O. FP paradigm: pure core, effect shell. |
| **Time-to-market** | Reuse existing CLIs (team_state, parallel_groups, worktree). `next-steps` extends team_state, does not replace it. |
| **Reliability** | Deterministic scheduling via algorithm, not LLM judgment. Worktree isolation prevents file conflicts. Atomic CLI commands (start-step, complete-step). |
| **Operability** | Single `sync-nwave.sh` command for upstream updates. `--dry-run` support. Change reporting. Version tracking via `nwave/VERSION`. |
| **Onboarding** | Single `./install.sh` command for consumer setup. Idempotent. Auto-configures Claude Code settings. Cleans up old installations. |

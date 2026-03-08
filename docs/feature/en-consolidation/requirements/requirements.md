# EN Consolidation — Requirements

## Goal

Consolidate the nWave framework and Agent Ensemble into a single, self-contained project under the `en:` prefix. Fork DES as a sync-able package, keep ensemble CLIs separate, rewrite `en:deliver` as the parallel team executor, and remove unused ensemble commands.

## Context

Currently nWave (`nw:*`) is installed globally and Agent Ensemble (`ensemble:*`) lives in this repo's `commands/` directory. The two systems are complementary but fragmented: nWave provides the development lifecycle (discover → deliver) with DES for TDD compliance tracking, while Agent Ensemble adds parallel execution with worktree isolation. This consolidation unifies them under one roof.

## Scope

### In Scope

1. Create `nwave/` as pristine upstream copy (commands, agents, skills, DES)
2. Generate `commands/` from `nwave/commands/` with `nw:` → `en:` rename (22 files)
3. Generate `agents/` from `nwave/agents/` with `nw-` → `en-` rename (22 files)
4. Generate `skills/` from `nwave/skills/` with path reference updates (80+ files)
5. Generate `src/des/` from `nwave/scripts/des/` as straight copy (sync-able)
6. Rename `src/agent_ensemble/` to `src/en/` (project-specific, not synced)
7. Rewrite `en:deliver` as parallel team executor (merging `ensemble:execute` + DES tracking)
8. Add `next-steps` CLI command to `en.cli.team_state` for deterministic execution scheduling
9. Keep `en:execute` as single-step dispatcher (current `nw:execute` behavior)
10. Delete all current ensemble commands except the rewritten `en:deliver`
11. Create `scripts/sync-nwave.sh` to automate upstream sync + rename transformation
12. Rename all references: `nw:` → `en:`, `nw-` → `en-`, `ensemble:` → `en:`
13. Update `install.sh` for project-local structure (Python deps, settings auto-config, old install cleanup, board UI)

### Key Constraint: Agent Name Collision

The `nw-` → `en-` rename is a **functional requirement** for Agent Teams, not just cosmetic. When `subagent_type: nw-software-crafter` is used in a team, Claude Code resolves it to the globally installed plugin at `~/.claude/agents/nw/` instead of any project-local copy. The plugin version uses `model: inherit` (broken in teams) and global skill paths. Renaming to `en-*` ensures Claude Code finds only the project-local agent definition with no collision.

Additionally, `model: inherit` must be replaced with an explicit model ID (`claude-opus-4-6`) in all generated agent files, as it causes silent failures in Agent Teams (agents spawn but never respond).

### en:deliver Workflow

```
/en:deliver {feature-id}
  │
  ├─ Phase 1: Roadmap (skip if exists)
  │   Spawn en-solution-architect → scaffold via des.cli.roadmap init → fill content
  │   Architect declares deps based on real coupling only (NOT "maximize parallelism")
  │   Validate schema + descriptions
  │
  ├─ Phase 2: Parallel Execution (Agent Teams, deterministic loop)
  │   Create team → init DES log
  │   LOOP:
  │     en.cli.team_state next-steps → returns spawnable steps (deterministic)
  │     start-step → spawn crafters → crafters run TDD with DES tracking
  │     Lazy reviewer spawning → approve → complete-step (merge worktree)
  │     → back to next-steps
  │   UNTIL next-steps returns empty
  │
  ├─ Phase 3: Verification
  │   Integration smoke test → L1-L4 refactoring → mutation testing → DES integrity
  │
  └─ Phase 4: Finalize
      Archive → cleanup team → report
```

**Key design decisions:**
- Execution ordering is **deterministic** via `team_state next-steps` CLI (Kahn's algorithm + status tracking). The Lead (LLM) never decides what to spawn — it calls the CLI and spawns what it returns.
- `parallel_groups analyze` remains as optional preview, not used to drive execution.
- Architect's job: declare correct dependencies. Algorithm's job: compute the schedule.

### Out of Scope

- Modifying DES internals (fork as-is)
- Changes to the board UI
- CI/CD pipeline changes

### Sync Architecture

```
nwave/          (pristine upstream — NEVER edit manually)
    ↓ scripts/sync-nwave.sh (copy + rename nw→en)
commands/       (generated, except deliver.md which is a project override)
agents/         (generated)
skills/         (generated)
src/des/        (generated, straight copy)
```

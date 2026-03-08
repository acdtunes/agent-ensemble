# ADR-018: EN Prefix Naming (Resolving Agent Name Collision)

## Status

Accepted

## Context

When Claude Code Agent Teams spawn a teammate with `subagent_type: nw-software-crafter`, Claude Code resolves the agent name by searching multiple locations. If the nWave plugin is installed globally at `~/.claude/agents/nw/`, the global `nw-software-crafter.md` is found instead of any project-local copy. The global version has two broken properties in Agent Teams context: (1) `model: inherit` does not resolve, causing agents to spawn but never respond, and (2) skill paths point to `~/.claude/skills/nw/` which may not exist or may be stale.

This is a confirmed, reproducible bug (2026-03-07). Renaming agents from `nw-*` to any non-colliding prefix eliminates the resolution conflict entirely.

Additionally, `ensemble:*` commands need consolidation with `nw:*` commands under a single prefix.

## Decision

Rename all agent files from `nw-*.md` to `en-*.md` and all slash commands from `/nw:*` to `/en:*`. The `en` prefix stands for "ensemble" and is short enough for ergonomic CLI use.

Within agent file content:
- All `subagent_type: nw-*` references become `subagent_type: en-*`
- All `model: inherit` lines become `model: claude-opus-4-6` (explicit, known-working model ID)
- All skill path references updated to project-local paths

## Alternatives Considered

### Alternative 1: Keep nw- prefix with project-local override

- **What**: Place `nw-*.md` files in project-local `agents/` directory, relying on Claude Code to prefer project-local over global
- **Expected Impact**: No rename needed, simpler migration
- **Why Insufficient**: Confirmed that Claude Code does NOT reliably prefer project-local when global plugin exists with same name. The collision is a name-resolution bug, not a precedence issue. Even if fixed in future Claude Code versions, depending on resolution order is fragile.

### Alternative 2: Use long prefix like `nw-teams-`

- **What**: Use `nw-teams-software-crafter` to avoid collision
- **Expected Impact**: Guaranteed unique, no collision possible
- **Why Insufficient**: Verbose for daily use. Every spawn command, every agent reference, every slash command becomes significantly longer. The prefix appears hundreds of times across command and agent files. `en-` achieves the same uniqueness in 2 characters.

### Alternative 3: Namespace via subdirectory

- **What**: Place agents in `agents/en/nw-software-crafter.md` using directory as namespace
- **Expected Impact**: Keeps original filenames, uses directory for disambiguation
- **Why Insufficient**: Claude Code's `subagent_type` field does not support directory namespacing. The value `nw-software-crafter` is resolved by filename, not path. Would require Claude Code changes outside our control.

## Consequences

- **Positive**: Eliminates agent name collision permanently. Short, ergonomic prefix. Consistent naming across commands, agents, and package (`en:`, `en-`, `src/en/`). Explicit model ID prevents silent spawn failures.
- **Negative**: Breaking change for any existing workflows referencing `nw:*` or `ensemble:*` commands. Model ID must be manually updated when Claude releases new versions.
- **Mitigation**: Single-developer project, no external consumers. Model ID update is a single `sed` command in the sync script, easily automated.

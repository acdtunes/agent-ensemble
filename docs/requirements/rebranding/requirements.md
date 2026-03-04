# Requirements — Rebranding to Agent Ensemble

## R1: Rename all user-facing display text

All UI surfaces must display "Agent Ensemble" instead of "NW Teams Board" or "NW Teams".

**Traces to**: Job Story (instant communication of purpose)

### Scope
- `board/src/App.tsx` — header, breadcrumbs, navigation
- `board/src/components/OverviewDashboard.tsx` — empty state text
- `board/index.html` — `<title>` tag
- Any other component rendering the old name

## R2: Rename npm package

The npm package must be renamed from `nw-teams-board` to `agent-ensemble`.

**Traces to**: Job Story (standalone identity)

### Scope
- `board/package.json` — `name` field
- `board/package-lock.json` — regenerate after rename

## R3: Rename Python package and module

The Python package and module must be renamed from `nw-teams`/`nw_teams` to `agent-ensemble`/`agent_ensemble`.

**Traces to**: Job Story (standalone identity)

### Scope
- `pyproject.toml` — `name`, `packages`, entry points
- `src/nw_teams/` — rename directory to `src/agent_ensemble/`
- All internal imports referencing `nw_teams`

## R4: Rename CLI command prefix

All CLI commands must use the `agent-ensemble:` prefix instead of `nw-teams:`.

**Traces to**: Job Story (instant communication at CLI touchpoint)

### Scope
- `commands/*.md` — command name references
- `install.sh` — symlink target paths

## R5: Update install script paths

The install script must create paths using `agent-ensemble` naming.

**Traces to**: Job Story (consistent identity at install touchpoint)

### Scope
- `install.sh` — all path references to `nw-teams`
- Command install directory: `~/.claude/commands/agent-ensemble/`
- Python install directory: `~/.claude/lib/python/agent_ensemble/`

## R6: Rename state directory

The runtime state directory must change from `.nw-teams/` to `.agent-ensemble/`.

**Traces to**: Job Story (consistent identity)

### Scope
- Server file-watching paths
- CLI state management code
- Any hardcoded references to `.nw-teams/`

## R7: Update documentation references

All documentation must reference the new name consistently.

**Traces to**: Job Story (consistent identity across all surfaces)

### Scope
- `docs/` — all markdown files referencing "nw-teams" or "NW Teams"
- `board/docs/` — ADRs and feature docs
- `CLAUDE.md` — if applicable

## R8: No residual old name references

After rebranding, no user-facing reference to "nw-teams" or "NW Teams" should remain in the codebase.

**Traces to**: Journey (no residual references scenario)

### Verification
- Grep for `nw.teams`, `NW.Teams`, `nw_teams` across all source files
- Only acceptable in git history and migration notes

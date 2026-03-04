# Shared Artifacts Registry — Rebranding

## Artifact Definitions

| Artifact ID | Value | Type | Source of Truth |
|-------------|-------|------|-----------------|
| `display-name` | "Agent Ensemble" | String | `board/src/App.tsx` |
| `package-name-npm` | `agent-ensemble` | String | `board/package.json` |
| `package-name-python` | `agent-ensemble` | String | `pyproject.toml` |
| `module-name` | `agent_ensemble` | String | `src/agent_ensemble/__init__.py` |
| `command-prefix` | `agent-ensemble:` | String | `commands/*.md` |
| `html-title` | "Agent Ensemble" | String | `board/index.html` |
| `install-path-commands` | `~/.claude/commands/agent-ensemble/` | Path | `install.sh` |
| `install-path-python` | `~/.claude/lib/python/agent_ensemble/` | Path | `install.sh` |

## Rename Mapping

| Category | From | To |
|----------|------|----|
| **Display** | "NW Teams Board" | "Agent Ensemble" |
| **Display** | "NW Teams" | "Agent Ensemble" |
| **npm** | `nw-teams-board` | `agent-ensemble` |
| **Python pkg** | `nw-teams` | `agent-ensemble` |
| **Python module** | `nw_teams` | `agent_ensemble` |
| **CLI prefix** | `nw-teams:` | `agent-ensemble:` |
| **HTML title** | "NW Teams Board" | "Agent Ensemble" |
| **Install cmd** | `~/.claude/commands/nw-teams/` | `~/.claude/commands/agent-ensemble/` |
| **Install py** | `~/.claude/lib/python/nw_teams/` | `~/.claude/lib/python/agent_ensemble/` |
| **State dir** | `.nw-teams/` | `.agent-ensemble/` |

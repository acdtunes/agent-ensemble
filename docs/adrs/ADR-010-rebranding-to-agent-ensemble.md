# ADR-010: Rebranding from NW Teams to Agent Ensemble

## Status

Accepted

## Context

The tool is currently named "NW Teams" across all surfaces (CLI commands, Python package, web dashboard, documentation). This name has three problems:

1. **Too generic** — "Teams" doesn't communicate what the tool does
2. **Coupled to parent framework** — "NW" ties identity to the nWave framework, preventing standalone recognition
3. **Lacks resonance** — the name doesn't evoke the tool's core purpose of coordinating AI agents

A JTBD analysis identified the primary job: developers want the name to instantly communicate AI agent orchestration for parallel software delivery.

## Decision

Rename the tool to **Agent Ensemble** across all surfaces:

| Surface | From | To |
|---------|------|----|
| Display name | "NW Teams Board" | "Agent Ensemble" |
| CLI commands | `/nw-teams:*` | `/agent-ensemble:*` |
| Python package | `nw-teams` / `nw_teams` | `agent-ensemble` / `agent_ensemble` |
| npm package | `nw-teams-board` | `agent-ensemble` |
| State directory | `.nw-teams/` | `.agent-ensemble/` |
| Install paths | `~/.claude/commands/nw-teams/` | `~/.claude/commands/agent-ensemble/` |

The install script will include migration logic to clean up old paths.

## Alternatives Considered

### 1. Keep "NW Teams"
Rejected — fails to communicate purpose, stays coupled to nWave.

### 2. Single-word names (Fleet, Swarm, Rally)
Considered but rejected in favor of a compound name that's more descriptive. "Agent" clearly signals AI agents, "Ensemble" evokes coordinated performance.

### 3. Different compound names (Agent Chorus, Agent Cadence, Agent Maestro)
All considered during JTBD analysis. "Agent Ensemble" was selected for its directness — an ensemble is literally a group performing together, which maps to what the tool does.

## Consequences

### Positive
- Name communicates purpose immediately
- Standalone identity, no parent framework coupling
- Active, dynamic energy matching the tool's nature

### Negative
- One-time migration effort across all surfaces (~450 reference updates)
- Existing documentation and git history will reference old name

### Neutral
- No architectural changes required
- No technology changes required
- No API or protocol changes required

# Technology Stack — Rebranding to Agent Ensemble

## No Technology Changes

The rebranding changes zero technology decisions. This document confirms the stack remains:

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| **Frontend** | React + TypeScript | 19.x + 5.7 | Unchanged |
| **Build** | Vite | 7.x | Unchanged |
| **Styling** | Tailwind CSS | 4.x | Unchanged |
| **Backend** | Express + WebSocket (ws) | 5.x + 8.x | Unchanged |
| **CLI** | Python | 3.11+ | Unchanged |
| **YAML** | PyYAML + ruamel.yaml | 6.0+ / 0.18+ | Unchanged |
| **Testing** | Vitest + pytest | 3.x / 7.x | Unchanged |
| **Mutation** | Stryker | 9.x | Unchanged |

## Development Paradigm

**Functional programming** — unchanged per CLAUDE.md.

## Package Identity Changes

| Surface | From | To |
|---------|------|----|
| npm package | `nw-teams-board` | `agent-ensemble` |
| Python package | `nw-teams` | `agent-ensemble` |
| Python module | `nw_teams` | `agent_ensemble` |
| CLI prefix | `nw-teams:` | `agent-ensemble:` |

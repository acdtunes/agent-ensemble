# US-00: GitHub Release (Walking Skeleton)

## User Story

**As a** developer who discovered Agent Ensemble,
**I want to** clone the GitHub repo and run a single install command,
**So that** I can use `/ensemble:*` skills in Claude Code and view the feature dashboard.

## Problem Statement

Agent Ensemble currently exists as an unshared local project. Developers cannot discover, install, or use it because:
1. No public GitHub repository exists
2. The install.sh doesn't install the nWave dependency
3. No README explains what the tool does or how to use it
4. The web dashboard requires manual setup

## Acceptance Criteria

### AC1: GitHub Repository
- [ ] Repository created at github.com/{user}/agent-ensemble
- [ ] .gitignore excludes node_modules, .venv, __pycache__, .DS_Store
- [ ] Initial commit includes all source files

### AC2: README with Quick Start
- [ ] README.md exists at repo root
- [ ] Quick Start section shows: clone → install → use
- [ ] Prerequisites listed: Claude Code, Python 3.11+
- [ ] nWave dependency clearly explained

### AC3: Install Script with nWave
- [ ] install.sh checks if nWave is installed
- [ ] If nWave missing, installs via `pipx install nwave-ai && nwave-ai install`
- [ ] Provides clear manual steps if pipx not available
- [ ] Creates symlinks for commands and Python library (existing behavior)

### AC4: Web Dashboard Instructions
- [ ] README explains how to start the dashboard server
- [ ] Board development setup documented (npm install, npm run dev)

### AC5: Ensemble Commands Documented
- [ ] All 10 `/ensemble:*` commands listed with descriptions
- [ ] Usage examples for key commands (/ensemble:deliver, /ensemble:review)

## Technical Notes

**Repository name**: agent-ensemble (matches existing package.json)
**Installation approach**: Git clone + install.sh (NOT PyPI for walking skeleton)
**nWave dependency**: `pipx install nwave-ai && nwave-ai install`

## Example: Happy Path

```bash
# 1. Clone
git clone https://github.com/{user}/agent-ensemble.git
cd agent-ensemble

# 2. Install (handles nWave dependency)
./install.sh

# 3. Use in Claude Code
# > /ensemble:deliver my-feature

# 4. (Optional) Run dashboard
cd board
npm install
npm run dev
# Open http://localhost:5173
```

## Out of Scope (Deferred)

- PyPI packaging (US-01 through US-04)
- `agent-ensemble` CLI tool
- Manifest-based install/uninstall
- Version tracking

## Dependencies

- None (foundational story)

## Estimated Effort

- 2 hours (walking skeleton)

## JTBD Mapping

| Job | Outcome |
|-----|---------|
| Install ensemble commands | Clone + ./install.sh completes in <2 minutes |
| Run feature dashboard | Clear instructions, works after npm install |

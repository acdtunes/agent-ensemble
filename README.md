# Agent Ensemble

**Ship features faster by running Claude Code agents in parallel.**

Instead of sequential agent workflows, Agent Ensemble coordinates teams of specialized agents (crafters, reviewers, researchers) working simultaneously with automatic worktree isolation and merge handling.

**Requires**: [nWave](https://github.com/nWave-ai/nWave) (installed automatically)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/acdtunes/agent-ensemble.git
cd agent-ensemble

# Install commands and CLI tools (also installs nWave if missing)
./install.sh

# Enable agent teams in Claude Code settings (see Configuration below)
```

## What You Get

### 10 Ensemble Commands

| Command | Description |
|---------|-------------|
| `/ensemble:deliver` | Parallel feature delivery with crafter+reviewer teams |
| `/ensemble:review` | Multi-perspective code review |
| `/ensemble:debug` | Competing hypotheses debugging |
| `/ensemble:design` | Cross-discipline architecture exploration |
| `/ensemble:discover` | Parallel research and requirements gathering |
| `/ensemble:distill` | Parallel acceptance test design |
| `/ensemble:document` | Parallel documentation generation |
| `/ensemble:execute` | Parallel feature execution |
| `/ensemble:refactor` | Parallel refactoring with multiple approaches |
| `/ensemble:audit` | Multi-perspective quality audit |

### Project Dashboard (Optional)

Visual board showing all projects and their features with roadmap progress.

```bash
cd board
npm install
npm run dev
# Starts both the API server and web UI
# Open http://localhost:5173
```

Add projects via the UI or create `.nw-board-projects.json` (see Configuration).

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Python 3.11+
- Node.js 18+ (for dashboard only)
- `pipx` recommended (for nWave installation)

## Usage

### Parallel Feature Delivery

The flagship command. Spawns teams of crafter+reviewer agents working in parallel:

```
> /ensemble:deliver auth-feature

# Lead analyzes roadmap, identifies parallel groups:
# Layer 1: steps 01-01, 01-02, 01-03 (spawn 3 crafter+reviewer pairs)
# Layer 2: step 02-01 (waits for Layer 1)
#
# Each crafter executes Outside-In TDD, sends to reviewer
# Reviewers validate quality, approve or request revision
# Lead merges worktrees, handles conflicts
```

### Code Review

Get multiple perspectives on your code changes:

```
> /ensemble:review

# Spawns parallel reviewers:
# - Security Auditor
# - Performance Optimizer
# - Maintainability Expert
# - Testing Specialist
#
# Each provides independent feedback
```

### Debugging

Attack problems from multiple angles:

```
> /ensemble:debug

# Spawns competing hypothesis investigators:
# - Each proposes and tests different root causes
# - Evidence-based elimination
# - Fastest path to resolution
```

## How It Works

1. **You invoke** an ensemble command
2. **Lead agent** analyzes the task and creates a team
3. **Specialist agents** work in parallel (crafters, reviewers, researchers)
4. **Agents communicate** via direct messages
5. **Lead coordinates** results, handles conflicts, reports summary

The ensemble commands build on [nWave](https://github.com/nWave-ai/nWave) agents, adding:
- Parallel execution coordination
- Worktree isolation for file conflicts
- Team state tracking
- Automatic merge handling

## Project Structure

```
agent-ensemble/
├── commands/           # Ensemble command definitions (.md files)
│   ├── deliver.md      # /ensemble:deliver
│   ├── review.md       # /ensemble:review
│   └── ...
├── src/
│   └── agent_ensemble/ # Python coordination library
│       └── cli/        # CLI tools for parallel execution
├── board/              # Feature dashboard (React + Vite)
│   ├── src/            # React components
│   └── server/         # Express server with WebSocket
└── docs/               # Feature documentation
```

## Configuration

### Claude Code Settings

Enable agent teams (required). Edit `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

If you already have settings, just add the `env` section to your existing file.

### Dashboard Projects (Optional)

You can add projects directly in the dashboard UI, or create `.nw-board-projects.json` in your home directory:

```json
{
  "projects": [
    {
      "id": "my-project",
      "name": "My Project",
      "path": "/path/to/my-project"
    }
  ]
}
```

Projects with feature roadmaps will show progress on the dashboard. The dashboard supports:
- `docs/feature/*/deliver/roadmap.json` (v2.0.0 preferred)
- `docs/feature/*/roadmap.json`
- `docs/feature/*/roadmap.yaml` (legacy)

## Updating

```bash
cd agent-ensemble
git pull
./install.sh
```

## Uninstalling

```bash
# Remove installed files
rm -rf ~/.claude/commands/ensemble
rm -rf ~/.claude/lib/python/agent_ensemble
rm -f ~/.claude/ensemble-manifest.txt

# Optionally remove nWave (uvx or pipx)
uvx uninstall nwave-ai
# or: pipx uninstall nwave-ai
```

## Related

- [nWave](https://github.com/nWave-ai/nWave) - Core agent framework (required dependency)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Anthropic's AI-powered CLI

## License

MIT

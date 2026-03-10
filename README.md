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

### 23 EN Commands

| Command | Description |
|---------|-------------|
| `/en:deliver` | Parallel feature delivery with crafter+reviewer teams |
| `/en:execute` | Parallel feature execution (single-step dispatch) |
| `/en:review` | Multi-perspective code review |
| `/en:design` | System architecture with C4 diagrams and tech selection |
| `/en:discover` | Evidence-based product discovery |
| `/en:discuss` | Jobs-to-be-Done analysis and UX journey design |
| `/en:distill` | Acceptance test design in Given-When-Then format |
| `/en:document` | Documentation following DIVIO/Diataxis principles |
| `/en:refactor` | Structured refactoring (RPP levels L1-L6) |
| `/en:devops` | CI/CD pipelines, infrastructure, deployment strategy |
| `/en:research` | Evidence-driven research with source verification |
| `/en:forge` | Create new specialized agents (5-phase workflow) |
| `/en:diagram` | C4 architecture diagrams in Mermaid or PlantUML |
| `/en:mutation-test` | Feature-scoped mutation testing (kill rate >= 80%) |
| `/en:root-why` | Root cause analysis and debugging |
| `/en:roadmap` | Roadmap creation for feature delivery |
| `/en:finalize` | Archive and close a delivered feature |
| `/en:mikado` | Complex refactoring roadmaps with visual tracking |
| `/en:hotspot` | Git change frequency hotspot analysis |
| `/en:rigor` | Configure rigor profile for delivery |
| `/en:new` | Scaffold a new feature |
| `/en:continue` | Resume an interrupted delivery |
| `/en:fast-forward` | Skip ahead in a delivery workflow |

### 10 Ensemble Commands (Agent Teams)

| Command | Description |
|---------|-------------|
| `/ensemble:deliver` | Parallel feature delivery with crafter+reviewer teams |
| `/ensemble:execute` | Parallel feature execution |
| `/ensemble:review` | Multi-perspective code review |
| `/ensemble:design` | Cross-discipline architecture exploration |
| `/ensemble:discover` | Parallel research and requirements gathering |
| `/ensemble:distill` | Parallel acceptance test design |
| `/ensemble:document` | Parallel documentation generation |
| `/ensemble:refactor` | Parallel refactoring with multiple approaches |
| `/ensemble:audit` | Multi-perspective quality audit |
| `/ensemble:debug` | Competing hypotheses debugging |

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

## Usage

### Parallel Feature Delivery

The flagship command. Spawns teams of crafter+reviewer agents working in parallel:

```
> /en:deliver auth-feature

# Lead analyzes roadmap, identifies parallel groups:
# Layer 1: steps 01-01, 01-02, 01-03 (spawn 3 crafter+reviewer pairs)
# Layer 2: step 02-01 (waits for Layer 1)
#
# Each crafter executes Outside-In TDD, sends to reviewer
# Reviewers validate quality, approve or request revision
# Lead merges worktrees, handles conflicts
```

### Code Review

```
> /en:review implementation "docs/feature/auth/deliver/execution-log.json"

# Dispatches a reviewer agent to critique implementation artifacts
# Includes Testing Theater 7-pattern detection
```

### Root Cause Analysis

```
> /en:root-why "Login fails intermittently under load"

# Systematic debugging with evidence-based investigation
```

## How It Works

1. **You invoke** an en: or ensemble: command
2. **Lead agent** analyzes the task and creates a team
3. **Specialist agents** work in parallel (crafters, reviewers, researchers)
4. **Agents communicate** via direct messages
5. **Lead coordinates** results, handles conflicts, reports summary

The commands build on [nWave](https://github.com/nWave-ai/nWave) agents, adding:
- Parallel execution coordination
- Worktree isolation for file conflicts
- Team state tracking via DES (Delivery Execution System)
- Automatic merge handling

## Project Structure

```
agent-ensemble/
├── commands/           # Command definitions (.md files)
│   ├── deliver.md      # /en:deliver
│   ├── review.md       # /en:review
│   └── ...             # 23 commands total
├── agents/             # Agent definitions (.md files)
├── skills/             # Agent skill files
├── src/
│   ├── en/             # Python coordination library + CLI
│   └── des/            # Delivery Execution System (TDD tracking)
├── board/              # Feature dashboard (React + Vite)
│   ├── src/            # React components
│   └── server/         # Express server with WebSocket
├── nwave/              # Vendored nWave upstream
├── scripts/            # Sync and validation scripts
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
rm -rf ~/.claude/commands/en
rm -rf ~/.claude/agents/en
rm -rf ~/.claude/skills/en
rm -rf ~/.claude/lib/python/en
rm -rf ~/.claude/lib/python/des
```

## Related

- [nWave](https://github.com/nWave-ai/nWave) - Core agent framework (required dependency)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Anthropic's AI-powered CLI

## License

MIT

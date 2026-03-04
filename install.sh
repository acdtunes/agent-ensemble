#!/usr/bin/env bash
# Install ensemble into ~/.claude/
# Creates symlinks so the repo stays the source of truth.
# Also installs nWave dependency if not present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing ensemble from $SCRIPT_DIR"
echo ""

# 0. Check/Install nWave dependency
echo "=== Checking nWave dependency ==="

NWAVE_INSTALLED=false
if command -v nwave-ai &> /dev/null; then
    NWAVE_VERSION=$(nwave-ai --version 2>/dev/null || echo "unknown")
    echo "  nWave found: $NWAVE_VERSION"
    NWAVE_INSTALLED=true
elif [ -d "$CLAUDE_DIR/agents" ] && ls "$CLAUDE_DIR/agents"/nw-*.md &> /dev/null 2>&1; then
    echo "  nWave agents found in ~/.claude/agents/"
    NWAVE_INSTALLED=true
fi

if [ "$NWAVE_INSTALLED" = false ]; then
    echo "  nWave not found. Agent Ensemble requires nWave."
    echo ""

    if command -v pipx &> /dev/null; then
        echo "  Installing nWave via pipx..."
        pipx install nwave-ai
        echo ""
        echo "  Running nwave-ai install..."
        nwave-ai install
        echo ""
        echo "  nWave installed successfully."
    else
        echo "  ERROR: pipx not found. Cannot auto-install nWave."
        echo ""
        echo "  Manual installation options:"
        echo ""
        echo "  Option 1 - Install pipx first:"
        echo "    brew install pipx    # macOS"
        echo "    pip install pipx --user && pipx ensurepath  # Linux/Windows"
        echo "    # Then restart terminal and re-run ./install.sh"
        echo ""
        echo "  Option 2 - Install nWave directly:"
        echo "    pip install nwave-ai --user"
        echo "    nwave-ai install"
        echo "    # Then re-run ./install.sh"
        echo ""
        echo "  See: https://github.com/nWave-ai/nWave"
        exit 1
    fi
fi

echo ""

# 1. Cleanup old nw-teams symlinks (migration)
if [ -L "$CLAUDE_DIR/commands/nw-teams" ]; then
    echo "  Removing old symlink: commands/nw-teams"
    rm "$CLAUDE_DIR/commands/nw-teams"
fi
if [ -L "$CLAUDE_DIR/lib/python/nw_teams" ]; then
    echo "  Removing old symlink: lib/python/nw_teams"
    rm "$CLAUDE_DIR/lib/python/nw_teams"
fi

# 3. Symlink commands
echo "=== Installing ensemble commands ==="
mkdir -p "$CLAUDE_DIR/commands"
if [ -L "$CLAUDE_DIR/commands/ensemble" ]; then
    rm "$CLAUDE_DIR/commands/ensemble"
elif [ -d "$CLAUDE_DIR/commands/ensemble" ]; then
    BACKUP="$CLAUDE_DIR/commands/ensemble.bak.$(date +%s)"
    echo "  Backing up existing directory -> $BACKUP"
    mv "$CLAUDE_DIR/commands/ensemble" "$BACKUP"
fi
ln -s "$SCRIPT_DIR/commands" "$CLAUDE_DIR/commands/ensemble"
echo "  Linked commands -> $CLAUDE_DIR/commands/ensemble"

# 5. Symlink Python package
echo "=== Installing Python library ==="
mkdir -p "$CLAUDE_DIR/lib/python"
if [ -L "$CLAUDE_DIR/lib/python/agent_ensemble" ]; then
    rm "$CLAUDE_DIR/lib/python/agent_ensemble"
elif [ -d "$CLAUDE_DIR/lib/python/agent_ensemble" ]; then
    BACKUP="$CLAUDE_DIR/lib/python/agent_ensemble.bak.$(date +%s)"
    echo "  Backing up existing directory -> $BACKUP"
    mv "$CLAUDE_DIR/lib/python/agent_ensemble" "$BACKUP"
fi
ln -s "$SCRIPT_DIR/src/agent_ensemble" "$CLAUDE_DIR/lib/python/agent_ensemble"
echo "  Linked Python package -> $CLAUDE_DIR/lib/python/agent_ensemble"

echo ""
echo "=== Installation complete ==="
echo ""
echo "Ensemble commands are now available in Claude Code:"
echo "  /ensemble:deliver  — Parallel feature delivery"
echo "  /ensemble:review   — Multi-perspective code review"
echo "  /ensemble:debug    — Competing hypotheses debugging"
echo "  /ensemble:design   — Cross-discipline architecture"
echo "  /ensemble:discover — Parallel research"
echo "  /ensemble:distill  — Parallel acceptance test design"
echo "  /ensemble:document — Parallel documentation"
echo "  /ensemble:execute  — Parallel feature execution"
echo "  /ensemble:refactor — Parallel refactoring"
echo "  /ensemble:audit    — Multi-perspective quality audit"
echo ""
echo "IMPORTANT: Enable agent teams in Claude Code:"
echo "  Add to ~/.claude/settings.json:"
echo '  { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'
echo ""
echo "Optional: Run the feature dashboard:"
echo "  cd board && npm install && npm run dev"

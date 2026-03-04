#!/usr/bin/env bash
# Install agent-ensemble into ~/.claude/
# Copies files so the installation is independent of the source repo.
# Also installs nWave dependency if not present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
VERSION="0.1.0"

echo "Installing agent-ensemble v$VERSION"
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

# 1. Cleanup old installations (symlinks or directories)
echo "=== Cleaning up old installations ==="

# Remove old nw-teams symlinks (migration from old name)
if [ -L "$CLAUDE_DIR/commands/nw-teams" ]; then
    echo "  Removing old symlink: commands/nw-teams"
    rm "$CLAUDE_DIR/commands/nw-teams"
fi
if [ -L "$CLAUDE_DIR/lib/python/nw_teams" ]; then
    echo "  Removing old symlink: lib/python/nw_teams"
    rm "$CLAUDE_DIR/lib/python/nw_teams"
fi

# Remove old ensemble symlinks (migration from symlink-based install)
if [ -L "$CLAUDE_DIR/commands/ensemble" ]; then
    echo "  Removing old symlink: commands/ensemble"
    rm "$CLAUDE_DIR/commands/ensemble"
fi
if [ -L "$CLAUDE_DIR/lib/python/agent_ensemble" ]; then
    echo "  Removing old symlink: lib/python/agent_ensemble"
    rm "$CLAUDE_DIR/lib/python/agent_ensemble"
fi

# Remove old ensemble directories (will be replaced)
if [ -d "$CLAUDE_DIR/commands/ensemble" ]; then
    echo "  Removing old directory: commands/ensemble"
    rm -rf "$CLAUDE_DIR/commands/ensemble"
fi
if [ -d "$CLAUDE_DIR/lib/python/agent_ensemble" ]; then
    echo "  Removing old directory: lib/python/agent_ensemble"
    rm -rf "$CLAUDE_DIR/lib/python/agent_ensemble"
fi

echo ""

# 2. Copy commands
echo "=== Installing ensemble commands ==="
mkdir -p "$CLAUDE_DIR/commands/ensemble"
cp -r "$SCRIPT_DIR/commands/"* "$CLAUDE_DIR/commands/ensemble/"
COMMAND_COUNT=$(ls -1 "$CLAUDE_DIR/commands/ensemble/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  Copied $COMMAND_COUNT commands to ~/.claude/commands/ensemble/"

# 3. Copy Python library
echo "=== Installing Python library ==="
mkdir -p "$CLAUDE_DIR/lib/python/agent_ensemble"
cp -r "$SCRIPT_DIR/src/agent_ensemble/"* "$CLAUDE_DIR/lib/python/agent_ensemble/"
# Remove __pycache__ directories from copied files
find "$CLAUDE_DIR/lib/python/agent_ensemble" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
CLI_COUNT=$(ls -1 "$CLAUDE_DIR/lib/python/agent_ensemble/cli/"*.py 2>/dev/null | grep -v __init__ | wc -l | tr -d ' ')
echo "  Copied Python library with $CLI_COUNT CLI modules to ~/.claude/lib/python/agent_ensemble/"

# 4. Write manifest for tracking
echo "=== Writing manifest ==="
MANIFEST_FILE="$CLAUDE_DIR/ensemble-manifest.txt"
cat > "$MANIFEST_FILE" << EOF
# agent-ensemble installation manifest
version=$VERSION
installed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
source_dir=$SCRIPT_DIR
commands_dir=$CLAUDE_DIR/commands/ensemble
python_dir=$CLAUDE_DIR/lib/python/agent_ensemble
EOF
echo "  Created manifest at $MANIFEST_FILE"

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
echo ""
echo "To update: git pull && ./install.sh"
echo "To uninstall: rm -rf ~/.claude/commands/ensemble ~/.claude/lib/python/agent_ensemble ~/.claude/ensemble-manifest.txt"

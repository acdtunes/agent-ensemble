#!/usr/bin/env bash
# Install agent-ensemble into ~/.claude/
# Creates symlinks so the repo stays the source of truth.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing agent-ensemble from $SCRIPT_DIR"

# 0. Cleanup old nw-teams symlinks (migration)
if [ -L "$CLAUDE_DIR/commands/nw-teams" ]; then
    echo "  Removing old symlink: commands/nw-teams"
    rm "$CLAUDE_DIR/commands/nw-teams"
fi
if [ -L "$CLAUDE_DIR/lib/python/nw_teams" ]; then
    echo "  Removing old symlink: lib/python/nw_teams"
    rm "$CLAUDE_DIR/lib/python/nw_teams"
fi

# 1. Symlink commands
mkdir -p "$CLAUDE_DIR/commands"
if [ -L "$CLAUDE_DIR/commands/agent-ensemble" ]; then
    rm "$CLAUDE_DIR/commands/agent-ensemble"
elif [ -d "$CLAUDE_DIR/commands/agent-ensemble" ]; then
    BACKUP="$CLAUDE_DIR/commands/agent-ensemble.bak.$(date +%s)"
    echo "  Backing up existing directory -> $BACKUP"
    mv "$CLAUDE_DIR/commands/agent-ensemble" "$BACKUP"
fi
ln -s "$SCRIPT_DIR/commands" "$CLAUDE_DIR/commands/agent-ensemble"
echo "  Linked commands -> $CLAUDE_DIR/commands/agent-ensemble"

# 2. Symlink Python package
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
echo "Done. agent-ensemble commands and CLI tools are now available."
echo "  /agent-ensemble:deliver  — Parallel feature delivery"
echo "  /agent-ensemble:review   — Multi-perspective code review"
echo "  /agent-ensemble:debug    — Competing hypotheses debugging"

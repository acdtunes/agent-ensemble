#!/usr/bin/env bash
# Install nw-teams into ~/.claude/
# Creates symlinks so the repo stays the source of truth.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing nw-teams from $SCRIPT_DIR"

# 1. Symlink commands
mkdir -p "$CLAUDE_DIR/commands"
if [ -L "$CLAUDE_DIR/commands/nw-teams" ]; then
    rm "$CLAUDE_DIR/commands/nw-teams"
elif [ -d "$CLAUDE_DIR/commands/nw-teams" ]; then
    BACKUP="$CLAUDE_DIR/commands/nw-teams.bak.$(date +%s)"
    echo "  Backing up existing directory -> $BACKUP"
    mv "$CLAUDE_DIR/commands/nw-teams" "$BACKUP"
fi
ln -s "$SCRIPT_DIR/commands" "$CLAUDE_DIR/commands/nw-teams"
echo "  Linked commands -> $CLAUDE_DIR/commands/nw-teams"

# 2. Symlink Python package
mkdir -p "$CLAUDE_DIR/lib/python"
if [ -L "$CLAUDE_DIR/lib/python/nw_teams" ]; then
    rm "$CLAUDE_DIR/lib/python/nw_teams"
elif [ -d "$CLAUDE_DIR/lib/python/nw_teams" ]; then
    BACKUP="$CLAUDE_DIR/lib/python/nw_teams.bak.$(date +%s)"
    echo "  Backing up existing directory -> $BACKUP"
    mv "$CLAUDE_DIR/lib/python/nw_teams" "$BACKUP"
fi
ln -s "$SCRIPT_DIR/src/nw_teams" "$CLAUDE_DIR/lib/python/nw_teams"
echo "  Linked Python package -> $CLAUDE_DIR/lib/python/nw_teams"

echo ""
echo "Done. nw-teams commands and CLI tools are now available."
echo "  /nw-teams:deliver  — Parallel feature delivery"
echo "  /nw-teams:review   — Multi-perspective code review"
echo "  /nw-teams:debug    — Competing hypotheses debugging"

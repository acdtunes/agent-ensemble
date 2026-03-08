#!/usr/bin/env bash
# Install en: framework globally into ~/.claude/
# Copies files and transforms paths for global usage.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing en: framework"
echo ""

# Transform project-relative paths to global ~/.claude/ paths
globalize() {
  sed \
    -e 's|skills/|~/.claude/skills/en/|g' \
    -e 's|PYTHONPATH=src/|PYTHONPATH=$HOME/.claude/lib/python|g' \
    -e 's|commands/|~/.claude/commands/en/|g' \
    -e 's|agents/en-|~/.claude/agents/en/en-|g'
}

# 1. Configure Claude Code settings for agent teams
echo "=== Configuring Claude Code settings ==="
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
KEY="CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"

if [ -f "$SETTINGS_FILE" ]; then
    if python3 -c "
import json, sys
with open('$SETTINGS_FILE') as f:
    data = json.load(f)
sys.exit(0 if data.get('env', {}).get('$KEY') == '1' else 1)
" 2>/dev/null; then
        echo "  Agent teams already enabled"
    else
        python3 -c "
import json
with open('$SETTINGS_FILE') as f:
    data = json.load(f)
data.setdefault('env', {})['$KEY'] = '1'
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
        echo "  Enabled agent teams in $SETTINGS_FILE"
    fi
else
    mkdir -p "$CLAUDE_DIR"
    python3 -c "
import json
data = {'env': {'$KEY': '1'}}
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
    echo "  Created $SETTINGS_FILE with agent teams enabled"
fi
echo ""

# 2. Copy commands (with path transforms)
echo "=== Installing en: commands ==="
mkdir -p "$CLAUDE_DIR/commands/en"
for src_file in "$SCRIPT_DIR/commands/"*.md; do
    [ -f "$src_file" ] || continue
    filename="$(basename "$src_file")"
    globalize < "$src_file" > "$CLAUDE_DIR/commands/en/$filename"
done
COMMAND_COUNT=$(ls -1 "$CLAUDE_DIR/commands/en/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  Installed $COMMAND_COUNT commands to ~/.claude/commands/en/"
echo ""

# 3. Copy agents (with path transforms)
echo "=== Installing en- agents ==="
mkdir -p "$CLAUDE_DIR/agents/en"
for src_file in "$SCRIPT_DIR/agents/"*.md; do
    [ -f "$src_file" ] || continue
    filename="$(basename "$src_file")"
    globalize < "$src_file" > "$CLAUDE_DIR/agents/en/$filename"
done
AGENT_COUNT=$(ls -1 "$CLAUDE_DIR/agents/en/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  Installed $AGENT_COUNT agents to ~/.claude/agents/en/"
echo ""

# 4. Copy skills (no transforms needed — content is domain knowledge)
echo "=== Installing skills ==="
mkdir -p "$CLAUDE_DIR/skills/en"
cp -r "$SCRIPT_DIR/skills/"* "$CLAUDE_DIR/skills/en/"
echo "  Installed to ~/.claude/skills/en/"
echo ""

# 5. Copy Python library
echo "=== Installing Python library ==="
mkdir -p "$CLAUDE_DIR/lib/python/en"
cp -r "$SCRIPT_DIR/src/en/"* "$CLAUDE_DIR/lib/python/en/"
find "$CLAUDE_DIR/lib/python/en" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
echo "  Installed to ~/.claude/lib/python/en/"
echo ""

# 6. Install board UI dependencies
echo "=== Installing board UI ==="
if command -v npm &> /dev/null; then
    (cd "$SCRIPT_DIR/board" && npm install --no-fund --no-audit 2>&1) | sed 's/^/  /'
    echo "  Board UI dependencies installed."
else
    echo "  WARNING: npm not found — skipping board UI install."
    echo "  To install manually: cd board && npm install"
fi

echo ""
echo "=== Installation complete ==="
echo ""
echo "Available /en:* commands:"
for cmd_file in "$SCRIPT_DIR/commands/"*.md; do
    [ -f "$cmd_file" ] || continue
    cmd_name=$(basename "$cmd_file" .md)
    echo "  /en:$cmd_name"
done
echo ""
echo "To update: git pull && ./install.sh"
echo "To uninstall: rm -rf ~/.claude/commands/en ~/.claude/agents/en ~/.claude/skills/en ~/.claude/lib/python/en"

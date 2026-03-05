#!/usr/bin/env bash
# Install agent-ensemble into ~/.claude/
# Copies files so the installation is independent of the source repo.
# Also installs nWave dependency if not present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
VERSION="0.1.0"

# nWave version pinning during migration period
# Pin to v1.9.0 until agent-ensemble is fully compatible with v2.0.0
NWAVE_PINNED_VERSION="1.9.0"
NWAVE_BREAKING_VERSION="2.0.0"

echo "Installing agent-ensemble v$VERSION"
echo ""

# Pure function: Check if version is compatible (less than breaking version)
# Returns 0 if compatible, 1 if incompatible
check_version_compatible() {
    local installed_version="$1"
    local breaking_version="$2"

    # Extract semver components (handle "nwave-ai X.Y.Z" format)
    local version_num
    version_num=$(echo "$installed_version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

    if [ -z "$version_num" ]; then
        # Cannot parse version, assume compatible
        return 0
    fi

    # Compare versions using sort -V
    local lower
    lower=$(printf '%s\n%s' "$version_num" "$breaking_version" | sort -V | head -1)

    if [ "$lower" = "$version_num" ] && [ "$version_num" != "$breaking_version" ]; then
        return 0  # installed < breaking, compatible
    else
        return 1  # installed >= breaking, incompatible
    fi
}

# Pure function: Print version compatibility warning
print_version_warning() {
    local installed_version="$1"
    echo ""
    echo "  WARNING: nWave $installed_version detected."
    echo "  agent-ensemble is currently compatible with nWave v$NWAVE_PINNED_VERSION."
    echo "  nWave v$NWAVE_BREAKING_VERSION introduces breaking changes."
    echo ""
    echo "  To downgrade to compatible version:"
    echo "    uvx uninstall nwave-ai && uvx install nwave-ai==$NWAVE_PINNED_VERSION"
    echo "    # or with pipx:"
    echo "    pipx uninstall nwave-ai && pipx install nwave-ai==$NWAVE_PINNED_VERSION"
    echo ""
    echo "  Migration to nWave v2.0.0 is in progress."
    echo ""
}

# Pure function: Install nWave with version pinning
# Tries uvx first, falls back to pipx
install_nwave() {
    local target_version="$1"

    if command -v uvx &> /dev/null; then
        echo "  Installing nWave v$target_version via uvx (preferred)..."
        uvx install "nwave-ai==$target_version"
        return 0
    elif command -v pipx &> /dev/null; then
        echo "  Installing nWave v$target_version via pipx..."
        pipx install "nwave-ai==$target_version"
        return 0
    else
        return 1
    fi
}

# Pure function: Print installation instructions when no package manager found
print_install_instructions() {
    echo "  ERROR: Neither uvx nor pipx found. Cannot auto-install nWave."
    echo ""
    echo "  Manual installation options:"
    echo ""
    echo "  Option 1 - Install uv/uvx first (recommended):"
    echo "    curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "    # Then restart terminal and re-run ./install.sh"
    echo ""
    echo "  Option 2 - Install pipx first:"
    echo "    brew install pipx    # macOS"
    echo "    pip install pipx --user && pipx ensurepath  # Linux/Windows"
    echo "    # Then restart terminal and re-run ./install.sh"
    echo ""
    echo "  Option 3 - Install nWave directly (version $NWAVE_PINNED_VERSION):"
    echo "    pip install nwave-ai==$NWAVE_PINNED_VERSION --user"
    echo "    nwave-ai install"
    echo "    # Then re-run ./install.sh"
    echo ""
    echo "  See: https://github.com/nWave-ai/nWave"
}

# 0. Check/Install nWave dependency
echo "=== Checking nWave dependency ==="

NWAVE_INSTALLED=false
NWAVE_VERSION_STR=""

if command -v nwave-ai &> /dev/null; then
    NWAVE_VERSION_STR=$(nwave-ai --version 2>/dev/null || echo "unknown")
    echo "  nWave found: $NWAVE_VERSION_STR"

    # Check version compatibility
    if ! check_version_compatible "$NWAVE_VERSION_STR" "$NWAVE_BREAKING_VERSION"; then
        print_version_warning "$NWAVE_VERSION_STR"
    fi

    NWAVE_INSTALLED=true
elif [ -d "$CLAUDE_DIR/agents" ] && ls "$CLAUDE_DIR/agents"/nw-*.md &> /dev/null 2>&1; then
    echo "  nWave agents found in ~/.claude/agents/"
    NWAVE_INSTALLED=true
fi

if [ "$NWAVE_INSTALLED" = false ]; then
    echo "  nWave not found. Agent Ensemble requires nWave."
    echo ""

    if install_nwave "$NWAVE_PINNED_VERSION"; then
        echo ""
        echo "  Running nwave-ai install..."
        nwave-ai install
        echo ""
        echo "  nWave v$NWAVE_PINNED_VERSION installed successfully."
    else
        print_install_instructions
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

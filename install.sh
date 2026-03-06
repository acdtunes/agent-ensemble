#!/usr/bin/env bash
# Install agent-ensemble into ~/.claude/
# Copies files so the installation is independent of the source repo.
# Also installs nWave dependency if not present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
VERSION="0.1.0"
MANIFEST_FILE="$CLAUDE_DIR/ensemble-manifest.txt"

# Parse command-line arguments
NWAVE_VERSION=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --nwave-version)
            NWAVE_VERSION="$2"
            shift 2
            ;;
        --nwave-version=*)
            NWAVE_VERSION="${1#*=}"
            shift
            ;;
        --help|-h)
            echo "Usage: ./install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --nwave-version VERSION  Install a specific nWave version (e.g. 1.9.0)"
            echo "  --help, -h               Show this help"
            echo ""
            echo "Examples:"
            echo "  ./install.sh                        # Install with latest nWave"
            echo "  ./install.sh --nwave-version 1.9.0  # Pin to specific version"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run ./install.sh --help for usage"
            exit 1
            ;;
    esac
done

# Build the nWave package specifier (with or without version)
nwave_package_spec() {
    if [ -n "$NWAVE_VERSION" ]; then
        echo "nwave-ai==$NWAVE_VERSION"
    else
        echo "nwave-ai"
    fi
}

echo "Installing agent-ensemble v$VERSION"
if [ -n "$NWAVE_VERSION" ]; then
    echo "  nWave version: $NWAVE_VERSION (pinned)"
fi
echo ""

# Install nWave using uv tool install (preferred) or pipx
install_nwave() {
    local spec
    spec=$(nwave_package_spec)

    if command -v uv &> /dev/null; then
        echo "  Installing $spec via uv tool install..."
        uv tool install "$spec"
        return 0
    elif command -v pipx &> /dev/null; then
        echo "  Installing $spec via pipx..."
        pipx install "$spec"
        return 0
    else
        return 1
    fi
}

# Upgrade/downgrade nWave to a specific version
reinstall_nwave() {
    local spec
    spec=$(nwave_package_spec)

    if command -v uv &> /dev/null; then
        echo "  Reinstalling $spec via uv tool install --force..."
        uv tool install "$spec" --force
        return 0
    elif command -v pipx &> /dev/null; then
        echo "  Reinstalling $spec via pipx install --force..."
        pipx install "$spec" --force
        return 0
    else
        return 1
    fi
}

# Print installation instructions when no package manager found
print_install_instructions() {
    echo "  ERROR: Neither uv nor pipx found. Cannot auto-install nWave."
    echo ""
    echo "  Manual installation options:"
    echo ""
    echo "  Option 1 - Install uv first (recommended):"
    echo "    curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "    # Then restart terminal and re-run ./install.sh"
    echo ""
    echo "  Option 2 - Install pipx first:"
    echo "    brew install pipx    # macOS"
    echo "    pip install pipx --user && pipx ensurepath  # Linux/Windows"
    echo "    # Then restart terminal and re-run ./install.sh"
    echo ""
    echo "  Option 3 - Install nWave directly:"
    echo "    pip install $(nwave_package_spec) --user"
    echo "    nwave-ai install"
    echo "    # Then re-run ./install.sh"
    echo ""
}

# Read previous nWave version from manifest
read_manifest_nwave_version() {
    if [ -f "$MANIFEST_FILE" ]; then
        grep "^nwave_version=" "$MANIFEST_FILE" 2>/dev/null | cut -d= -f2 || echo ""
    else
        echo ""
    fi
}

# Detect currently installed nWave version
detect_nwave_version() {
    if command -v nwave-ai &> /dev/null; then
        nwave-ai --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown"
    else
        echo ""
    fi
}

# 0. Check/Install nWave dependency
echo "=== Checking nWave dependency ==="

CURRENT_NWAVE_VERSION=$(detect_nwave_version)
PREVIOUS_NWAVE_VERSION=$(read_manifest_nwave_version)

if [ -n "$CURRENT_NWAVE_VERSION" ] && [ "$CURRENT_NWAVE_VERSION" != "unknown" ]; then
    echo "  nWave found: v$CURRENT_NWAVE_VERSION"

    if [ -n "$NWAVE_VERSION" ] && [ "$NWAVE_VERSION" != "$CURRENT_NWAVE_VERSION" ]; then
        echo "  Requested version: v$NWAVE_VERSION (current: v$CURRENT_NWAVE_VERSION)"
        if reinstall_nwave; then
            echo ""
            echo "  Running nwave-ai install..."
            nwave-ai install
            echo "  nWave v$NWAVE_VERSION installed."
            CURRENT_NWAVE_VERSION="$NWAVE_VERSION"
        else
            print_install_instructions
            exit 1
        fi
    fi
elif [ -d "$CLAUDE_DIR/agents" ] && ls "$CLAUDE_DIR/agents"/nw-*.md &> /dev/null 2>&1; then
    echo "  nWave agents found in ~/.claude/agents/"
    CURRENT_NWAVE_VERSION="agents-only"
else
    echo "  nWave not found. Agent Ensemble requires nWave."
    echo ""

    if install_nwave; then
        echo ""
        echo "  Running nwave-ai install..."
        nwave-ai install
        echo ""
        echo "  nWave installed successfully."
        CURRENT_NWAVE_VERSION=$(detect_nwave_version)
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
cat > "$MANIFEST_FILE" << EOF
# agent-ensemble installation manifest
version=$VERSION
installed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
source_dir=$SCRIPT_DIR
commands_dir=$CLAUDE_DIR/commands/ensemble
python_dir=$CLAUDE_DIR/lib/python/agent_ensemble
nwave_version=$CURRENT_NWAVE_VERSION
nwave_previous_version=$PREVIOUS_NWAVE_VERSION
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
echo "To pin nWave:     ./install.sh --nwave-version 1.9.0"
echo "To uninstall:     rm -rf ~/.claude/commands/ensemble ~/.claude/lib/python/agent_ensemble ~/.claude/ensemble-manifest.txt"
echo "To uninstall nWave: uv tool uninstall nwave-ai  (or: pipx uninstall nwave-ai)"

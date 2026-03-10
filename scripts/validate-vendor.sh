#!/usr/bin/env bash
# Validate nwave/ vendor directory against upstream nWave-ai/nWave.
# Exit codes: 0 = valid, 1 = validation failure, 2 = upstream unreachable.
set -euo pipefail

REPO="${NWAVE_REPO:-nWave-ai/nWave}"
UPSTREAM_PREFIX="plugins/nw"
VENDOR_DIR="${VENDOR_DIR:-nwave}"
REQUIRED_DIRS=("commands" "agents" "skills" "scripts")

# Resolve vendor dir: VENDOR_PATH overrides, else relative to project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR_PATH="${VENDOR_PATH:-$PROJECT_ROOT/$VENDOR_DIR}"

errors=0
warnings=0

error() { echo "ERROR: $1" >&2; errors=$((errors + 1)); }
warn()  { echo "WARN:  $1" >&2; warnings=$((warnings + 1)); }
info()  { echo "INFO:  $1"; }

# --- 1. Check vendor directory exists ---
if [ ! -d "$VENDOR_PATH" ]; then
    error "Vendor directory $VENDOR_PATH does not exist"
    exit 1
fi

# --- 2. Check required subdirectories ---
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$VENDOR_PATH/$dir" ]; then
        error "Required directory missing: $VENDOR_DIR/$dir"
    else
        info "Directory present: $VENDOR_DIR/$dir"
    fi
done

if [ "$errors" -gt 0 ]; then
    echo "FAIL: $errors missing directories"
    exit 1
fi

# --- 3. Fetch upstream file listing with SHA hashes ---
info "Fetching upstream tree from $REPO..."
upstream_tree=$(gh api "repos/$REPO/git/trees/main?recursive=1" \
    --jq "[.tree[] | select(.path | startswith(\"$UPSTREAM_PREFIX/\")) | select(.type==\"blob\") | {path: (.path | ltrimstr(\"$UPSTREAM_PREFIX/\")), sha}]" 2>/dev/null) || {
    error "Cannot reach upstream repository $REPO"
    exit 2
}

if [ -z "$upstream_tree" ] || [ "$upstream_tree" = "[]" ]; then
    error "Upstream tree is empty or unreachable"
    exit 2
fi

upstream_count=$(echo "$upstream_tree" | jq 'length')
info "Upstream has $upstream_count files"

# --- 4. Compare using temp files (compatible with bash 3.x) ---
upstream_manifest=$(mktemp)
trap "rm -f '$upstream_manifest'" EXIT

echo "$upstream_tree" | jq -r '.[] | "\(.path)\t\(.sha)"' | sort > "$upstream_manifest"

# Check each upstream file exists locally and matches SHA
missing=0
modified=0
while IFS=$'\t' read -r path expected_sha; do
    # Skip files we deliberately exclude from vendor (not source)
    [[ "$path" == .claude-plugin/* ]] && continue
    [[ "$path" == marketplace-manifest.json ]] && continue

    # Skip files intentionally diverged from upstream (nw→en rename, local customizations)
    [[ "$path" == commands/deliver.md ]] && continue
    [[ "$path" == commands/design.md ]] && continue
    [[ "$path" == commands/devops.md ]] && continue
    [[ "$path" == commands/discover.md ]] && continue
    [[ "$path" == commands/discuss.md ]] && continue
    [[ "$path" == commands/distill.md ]] && continue
    [[ "$path" == hooks/hooks.json ]] && continue

    local_file="$VENDOR_PATH/$path"
    if [ ! -f "$local_file" ]; then
        error "Missing from vendor: $path"
        missing=$((missing + 1))
        continue
    fi
    local_sha=$(git hash-object "$local_file")
    if [ "$local_sha" != "$expected_sha" ]; then
        error "Modified: $path (local=$local_sha upstream=$expected_sha)"
        modified=$((modified + 1))
    fi
done < "$upstream_manifest"

# Check for extra local files not in upstream
extra=0
while IFS= read -r local_file; do
    rel_path="${local_file#$VENDOR_PATH/}"
    if ! grep -q "^${rel_path}	" "$upstream_manifest"; then
        warn "Extra file not in upstream: $rel_path"
        extra=$((extra + 1))
    fi
done < <(find "$VENDOR_PATH" -type f | sort)

# --- 5. Summary ---
local_count=$(find "$VENDOR_PATH" -type f | wc -l | tr -d ' ')
info "Local files: $local_count, Upstream files: $upstream_count"
info "Missing: $missing, Modified: $modified, Extra: $extra"

if [ "$errors" -gt 0 ]; then
    echo "FAIL: Vendor integrity check failed ($errors errors, $warnings warnings)"
    exit 1
fi

if [ "$warnings" -gt 0 ]; then
    echo "WARN: Vendor has $warnings warnings but passes integrity check"
    exit 0
fi

echo "OK: Vendor directory matches upstream"
exit 0

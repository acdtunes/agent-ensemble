#!/usr/bin/env bash
# Fetch nWave vendor files from upstream GitHub repository.
# Fails gracefully when upstream is unreachable, preserving existing nwave/ directory.
#
# Usage:
#   ./scripts/fetch-vendor.sh [--ref REF] [--dest DIR]
#
# Options:
#   --ref REF    Git ref to fetch (branch, tag, commit). Default: main
#   --dest DIR   Destination directory. Default: nwave/
#
# Exit codes:
#   0  Success
#   1  Connectivity/fetch error (existing nwave/ unchanged)
#   2  Invalid arguments

set -euo pipefail

readonly UPSTREAM_OWNER="nWave-ai"
readonly UPSTREAM_REPO="nWave"
readonly UPSTREAM_API="https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REF="main"
DEST_DIR="${PROJECT_ROOT}/nwave"

# --- Argument parsing ---

while [[ $# -gt 0 ]]; do
    case $1 in
        --ref)
            [[ $# -lt 2 ]] && { echo "ERROR: --ref requires a value" >&2; exit 2; }
            REF="$2"; shift 2 ;;
        --ref=*)
            REF="${1#*=}"; shift ;;
        --dest)
            [[ $# -lt 2 ]] && { echo "ERROR: --dest requires a value" >&2; }
            DEST_DIR="$2"; shift 2 ;;
        --dest=*)
            DEST_DIR="${1#*=}"; shift ;;
        --help|-h)
            sed -n '2,/^$/{ s/^# //; s/^#$//; p }' "$0"
            exit 0 ;;
        *)
            echo "ERROR: Unknown option: $1" >&2; exit 2 ;;
    esac
done

# --- Helper functions ---

log_info() { echo "  $*"; }
log_error() { echo "ERROR: $*" >&2; }

# Check upstream reachability via GitHub API.
# Returns 0 if reachable, 1 otherwise.
check_upstream_reachable() {
    local http_code
    http_code=$(curl --silent --output /dev/null --write-out "%{http_code}" \
        --max-time 10 --connect-timeout 5 \
        "${UPSTREAM_API}" 2>/dev/null) || {
        log_error "Cannot connect to GitHub API (network error)."
        log_error "Upstream ${UPSTREAM_OWNER}/${UPSTREAM_REPO} is unreachable."
        return 1
    }

    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        return 0
    elif [[ "$http_code" == "404" ]]; then
        log_error "Repository ${UPSTREAM_OWNER}/${UPSTREAM_REPO} not found (HTTP 404)."
        return 1
    elif [[ "$http_code" == "403" ]]; then
        log_error "GitHub API rate limit exceeded or access denied (HTTP 403)."
        return 1
    else
        log_error "GitHub API returned unexpected status (HTTP ${http_code})."
        return 1
    fi
}

# Fetch tarball from upstream into a temporary directory.
# Writes the temp directory path to stdout on success.
fetch_tarball() {
    local ref="$1"
    local tmp_dir
    tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/nwave-fetch.XXXXXX")

    local tarball_url="${UPSTREAM_API}/tarball/${ref}"
    local archive_path="${tmp_dir}/archive.tar.gz"

    if ! curl --silent --location --fail \
        --max-time 60 --connect-timeout 10 \
        --output "$archive_path" \
        "$tarball_url" 2>/dev/null; then
        log_error "Failed to download tarball for ref '${ref}'."
        log_error "URL: ${tarball_url}"
        rm -rf "$tmp_dir"
        return 1
    fi

    if [[ ! -s "$archive_path" ]]; then
        log_error "Downloaded archive is empty for ref '${ref}'."
        rm -rf "$tmp_dir"
        return 1
    fi

    local extract_dir="${tmp_dir}/extracted"
    mkdir -p "$extract_dir"

    if ! tar xzf "$archive_path" -C "$extract_dir" 2>/dev/null; then
        log_error "Failed to extract archive for ref '${ref}'."
        rm -rf "$tmp_dir"
        return 1
    fi

    echo "$tmp_dir"
}

# Atomically replace destination with fetched content.
# Uses rename to avoid partial writes.
atomic_replace() {
    local tmp_dir="$1"
    local dest="$2"
    local extract_dir="${tmp_dir}/extracted"

    # GitHub tarballs extract into a single top-level directory
    local top_level
    top_level=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | head -1)

    if [[ -z "$top_level" ]]; then
        log_error "Extracted archive has no top-level directory."
        return 1
    fi

    # Stage the new content next to the destination
    local staged="${dest}.staging.$$"
    rm -rf "$staged"
    cp -R "$top_level" "$staged"

    # Atomic swap: move old out, move new in
    if [[ -d "$dest" ]]; then
        local backup="${dest}.backup.$$"
        mv "$dest" "$backup"
        if mv "$staged" "$dest"; then
            rm -rf "$backup"
        else
            # Restore on failure
            mv "$backup" "$dest"
            rm -rf "$staged"
            log_error "Failed to move staged content to ${dest}."
            return 1
        fi
    else
        mv "$staged" "$dest"
    fi
}

# --- Main ---

echo "=== Fetching nWave vendor files ==="
log_info "Upstream: ${UPSTREAM_OWNER}/${UPSTREAM_REPO}"
log_info "Ref: ${REF}"
log_info "Destination: ${DEST_DIR}"
echo ""

# Step 1: Check connectivity
log_info "Checking upstream reachability..."
if ! check_upstream_reachable; then
    echo ""
    log_error "Upstream is unreachable. Existing ${DEST_DIR}/ has NOT been modified."
    log_error "Check your network connection and try again."
    exit 1
fi
log_info "Upstream is reachable."
echo ""

# Step 2: Fetch tarball
log_info "Downloading ref '${REF}'..."
tmp_dir=""
if ! tmp_dir=$(fetch_tarball "$REF"); then
    echo ""
    log_error "Fetch failed. Existing ${DEST_DIR}/ has NOT been modified."
    exit 1
fi
log_info "Download complete."
echo ""

# Step 3: Atomic replace
log_info "Updating ${DEST_DIR}/..."
if ! atomic_replace "$tmp_dir" "$DEST_DIR"; then
    rm -rf "$tmp_dir"
    echo ""
    log_error "Update failed. Existing ${DEST_DIR}/ has NOT been modified."
    exit 1
fi

# Cleanup temp files
rm -rf "$tmp_dir"

log_info "Vendor files updated successfully."
echo ""
echo "=== Fetch complete ==="

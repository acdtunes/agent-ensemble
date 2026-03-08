#!/usr/bin/env bash
set -euo pipefail

# sync-nwave.sh — Fetch upstream nWave and generate commands/, agents/, skills/, src/des/.
#
# Usage: sync-nwave.sh [--dry-run] [--ref REF]
#
# Flags:
#   --dry-run   Preview changes without writing files
#   --ref REF   Git ref to fetch (branch, tag, commit). Default: main
#
# Transforms applied:
#   1. /nw: → /en: in slash command references
#   2. nw- agent references → en- (e.g., nw-software-crafter → en-software-crafter)
#   3. Skill paths ~/.claude/skills/nw/ → skills/ (project-relative)
#   4. PYTHONPATH references $HOME/.claude/lib/python → src/ (project-relative)
#   5. ~/.claude/commands/nw/ → commands/ (project-relative)
#   6. ~/.claude/agents/nw/ → agents/ (project-relative)
#   7. .nwave/ → .en/ (project-local config dir)
#   8. NW- title prefixes → EN- (e.g., NW-EXECUTE → EN-EXECUTE)
#   9. nWave brand references → en (where contextual)
#  10. model: inherit → model: sonnet (agents only)
#  11. nWave/agents/nw- → agents/en- (internal references)
#  12. nWave/skills/ → skills/ (internal references)
#
# deliver.md is NEVER overwritten if it already exists (project override).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
REF="main"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --ref) shift; REF="$1" ;;
    --ref=*) REF="${arg#*=}" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

readonly UPSTREAM_OWNER="nWave-ai"
readonly UPSTREAM_REPO="nWave"
readonly UPSTREAM_API="https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}"
readonly VENDOR_DIR="${PROJECT_ROOT}/nwave"

# --- Fetch functions ---

log_info() { echo "  $*"; }
log_error() { echo "ERROR: $*" >&2; }

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

atomic_replace() {
  local tmp_dir="$1"
  local dest="$2"
  local extract_dir="${tmp_dir}/extracted"

  local top_level
  top_level=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | head -1)

  if [[ -z "$top_level" ]]; then
      log_error "Extracted archive has no top-level directory."
      return 1
  fi

  local plugin_dir="$top_level/plugins/nw"
  if [[ ! -d "$plugin_dir" ]]; then
      log_error "Expected plugins/nw/ not found in upstream archive."
      return 1
  fi

  local staged="${dest}.staging.$$"
  rm -rf "$staged"
  mkdir -p "$staged"
  cp -R "$plugin_dir/commands" "$staged/"
  cp -R "$plugin_dir/agents" "$staged/"
  cp -R "$plugin_dir/skills" "$staged/"
  cp -R "$plugin_dir/scripts" "$staged/"
  [[ -d "$plugin_dir/hooks" ]] && cp -R "$plugin_dir/hooks" "$staged/"

  if [[ -d "$dest" ]]; then
      local backup="${dest}.backup.$$"
      mv "$dest" "$backup"
      if mv "$staged" "$dest"; then
          rm -rf "$backup"
      else
          mv "$backup" "$dest"
          rm -rf "$staged"
          log_error "Failed to move staged content to ${dest}."
          return 1
      fi
  else
      mv "$staged" "$dest"
  fi
}

fetch_upstream() {
  echo "=== Fetching nWave upstream ==="
  log_info "Upstream: ${UPSTREAM_OWNER}/${UPSTREAM_REPO}"
  log_info "Ref: ${REF}"
  echo ""

  log_info "Checking upstream reachability..."
  if ! check_upstream_reachable; then
      echo ""
      log_error "Upstream is unreachable. Existing nwave/ has NOT been modified."
      log_error "Check your network connection or use --local to skip fetch."
      exit 1
  fi
  log_info "Upstream is reachable."
  echo ""

  log_info "Downloading ref '${REF}'..."
  local tmp_dir=""
  if ! tmp_dir=$(fetch_tarball "$REF"); then
      echo ""
      log_error "Fetch failed. Existing nwave/ has NOT been modified."
      exit 1
  fi
  log_info "Download complete."
  echo ""

  log_info "Updating nwave/..."
  if ! atomic_replace "$tmp_dir" "$VENDOR_DIR"; then
      rm -rf "$tmp_dir"
      log_error "Update failed. Existing nwave/ has NOT been modified."
      exit 1
  fi
  rm -rf "$tmp_dir"
  log_info "Vendor files updated."
  echo ""
}

# --- Sync functions ---

# Counters for final summary
TOTAL_ADDED=0
TOTAL_CHANGED=0
TOTAL_UNCHANGED=0
TOTAL_SKIPPED=0
ERRORS=0

# Shared sed transforms for nw→en renaming and path rewriting.
apply_transforms() {
  sed \
    -e 's|/nw:|/en:|g' \
    -e 's|@nw-|@en-|g' \
    -e 's|nw-product-discoverer-reviewer|en-product-discoverer-reviewer|g' \
    -e 's|nw-product-discoverer|en-product-discoverer|g' \
    -e 's|nw-product-owner-reviewer|en-product-owner-reviewer|g' \
    -e 's|nw-product-owner|en-product-owner|g' \
    -e 's|nw-solution-architect-reviewer|en-solution-architect-reviewer|g' \
    -e 's|nw-solution-architect|en-solution-architect|g' \
    -e 's|nw-software-crafter-reviewer|en-software-crafter-reviewer|g' \
    -e 's|nw-software-crafter|en-software-crafter|g' \
    -e 's|nw-functional-software-crafter|en-functional-software-crafter|g' \
    -e 's|nw-acceptance-designer-reviewer|en-acceptance-designer-reviewer|g' \
    -e 's|nw-acceptance-designer|en-acceptance-designer|g' \
    -e 's|nw-platform-architect-reviewer|en-platform-architect-reviewer|g' \
    -e 's|nw-platform-architect|en-platform-architect|g' \
    -e 's|nw-data-engineer-reviewer|en-data-engineer-reviewer|g' \
    -e 's|nw-data-engineer|en-data-engineer|g' \
    -e 's|nw-researcher-reviewer|en-researcher-reviewer|g' \
    -e 's|nw-researcher|en-researcher|g' \
    -e 's|nw-documentarist-reviewer|en-documentarist-reviewer|g' \
    -e 's|nw-documentarist|en-documentarist|g' \
    -e 's|nw-troubleshooter-reviewer|en-troubleshooter-reviewer|g' \
    -e 's|nw-troubleshooter|en-troubleshooter|g' \
    -e 's|nw-agent-builder-reviewer|en-agent-builder-reviewer|g' \
    -e 's|nw-agent-builder|en-agent-builder|g' \
    -e 's|nw-\*-reviewer|en-*-reviewer|g' \
    -e 's|nw-{agent-name}|en-{agent-name}|g' \
    -e 's|~/.claude/skills/nw/|skills/|g' \
    -e 's|PYTHONPATH=\$HOME/.claude/lib/python|PYTHONPATH=src/|g' \
    -e 's|PYTHONPATH=~/.claude/lib/python|PYTHONPATH=src/|g' \
    -e 's|~/.claude/commands/nw/|commands/|g' \
    -e 's|~/.claude/agents/nw/|agents/|g' \
    -e 's|\.nwave/|.en/|g' \
    -e 's|~/.claude/nWave/skills/|skills/|g' \
    -e 's|nWave/agents/nw-|agents/en-|g' \
    -e 's|nWave/skills/|skills/|g' \
    -e 's|# NW-|# EN-|g' \
    -e 's|NW-EXECUTE|EN-EXECUTE|g' \
    -e 's|NW-DELIVER|EN-DELIVER|g' \
    -e 's|NW-DISCOVER|EN-DISCOVER|g' \
    -e 's|\\[*]\([a-z][a-z-]*\)|/en:\1|g'
}

classify_change() {
  local target_file="$1"
  local new_content="$2"

  if [[ ! -f "$target_file" ]]; then
    echo "added"
    return
  fi

  local existing_content
  existing_content="$(cat "$target_file")"

  if [[ "$existing_content" == "$new_content" ]]; then
    echo "unchanged"
  else
    echo "changed"
  fi
}

write_or_report() {
  local target_file="$1"
  local new_content="$2"
  local label="$3"

  local status
  status="$(classify_change "$target_file" "$new_content")"

  case "$status" in
    added)
      TOTAL_ADDED=$((TOTAL_ADDED + 1))
      if $DRY_RUN; then
        echo "  [add] $label"
      else
        echo "$new_content" > "$target_file"
        echo "  [add] $label"
      fi
      ;;
    changed)
      TOTAL_CHANGED=$((TOTAL_CHANGED + 1))
      if $DRY_RUN; then
        echo "  [update] $label"
      else
        echo "$new_content" > "$target_file"
        echo "  [update] $label"
      fi
      ;;
    unchanged)
      TOTAL_UNCHANGED=$((TOTAL_UNCHANGED + 1))
      ;;
  esac
}

sync_commands() {
  local source_dir="$PROJECT_ROOT/nwave/commands"
  local target_dir="$PROJECT_ROOT/commands"

  if [[ ! -d "$source_dir" ]]; then
    echo "WARNING: Source directory not found: $source_dir (skipping commands)" >&2
    ERRORS=$((ERRORS + 1))
    return
  fi

  $DRY_RUN || mkdir -p "$target_dir"

  for src_file in "$source_dir"/*.md; do
    [[ -e "$src_file" ]] || continue
    local filename
    filename="$(basename "$src_file")"

    # Never overwrite deliver.md if it exists (project override)
    if [[ "$filename" == "deliver.md" && -f "$target_dir/$filename" ]]; then
      TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
      echo "  [skip] commands/$filename (project override)"
      continue
    fi

    local new_content
    new_content="$(apply_transforms < "$src_file")"
    write_or_report "$target_dir/$filename" "$new_content" "commands/$filename"
  done
}

sync_agents() {
  local source_dir="$PROJECT_ROOT/nwave/agents"
  local target_dir="$PROJECT_ROOT/agents"

  if [[ ! -d "$source_dir" ]]; then
    echo "WARNING: Agent source directory not found: $source_dir (skipping agents)" >&2
    ERRORS=$((ERRORS + 1))
    return
  fi

  $DRY_RUN || mkdir -p "$target_dir"

  for src_file in "$source_dir"/nw-*.md; do
    [[ -e "$src_file" ]] || continue
    local src_name target_name
    src_name="$(basename "$src_file")"
    # Rename nw-*.md → en-*.md
    target_name="en-${src_name#nw-}"

    local new_content
    new_content="$(apply_transforms < "$src_file" | sed -e 's|^model: inherit$|model: sonnet|')"
    write_or_report "$target_dir/$target_name" "$new_content" "agents/$target_name"
  done
}

sync_skills() {
  local source_dir="$PROJECT_ROOT/nwave/skills"
  local target_dir="$PROJECT_ROOT/skills"

  if [[ ! -d "$source_dir" ]]; then
    echo "WARNING: Skills source directory not found: $source_dir (skipping skills)" >&2
    ERRORS=$((ERRORS + 1))
    return
  fi

  local source_files
  source_files="$(cd "$source_dir" && find . -type f | sort)"

  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    rel_path="${rel_path#./}"
    local src="$source_dir/$rel_path"
    local dst="$target_dir/$rel_path"

    local new_content
    new_content="$(cat "$src")"

    if [[ ! -f "$dst" ]]; then
      TOTAL_ADDED=$((TOTAL_ADDED + 1))
      if $DRY_RUN; then
        echo "  [add] skills/$rel_path"
      else
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "  [add] skills/$rel_path"
      fi
    elif cmp -s "$src" "$dst"; then
      TOTAL_UNCHANGED=$((TOTAL_UNCHANGED + 1))
    else
      TOTAL_CHANGED=$((TOTAL_CHANGED + 1))
      if $DRY_RUN; then
        echo "  [update] skills/$rel_path"
      else
        cp "$src" "$dst"
        echo "  [update] skills/$rel_path"
      fi
    fi
  done <<< "$source_files"

  # Remove files in target that no longer exist in source
  if [[ -d "$target_dir" ]]; then
    local target_files
    target_files="$(cd "$target_dir" && find . -type f | sort)"
    while IFS= read -r rel_path; do
      [[ -n "$rel_path" ]] || continue
      rel_path="${rel_path#./}"
      if [[ ! -f "$source_dir/$rel_path" ]]; then
        if $DRY_RUN; then
          echo "  [remove] skills/$rel_path"
        else
          rm "$target_dir/$rel_path"
          echo "  [remove] skills/$rel_path"
        fi
      fi
    done <<< "$target_files"
  fi
}

write_version() {
  local version_file="$PROJECT_ROOT/nwave/VERSION"

  local tag commit synced_at

  tag="$(gh api repos/nWave-ai/nWave/releases/latest --jq '.tag_name' 2>/dev/null || echo 'unknown')"
  commit="$(gh api repos/nWave-ai/nWave/commits/main --jq '.sha' 2>/dev/null || echo 'unknown')"
  synced_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local content
  content="tag: ${tag}
commit: ${commit}
synced_at: ${synced_at}"

  if $DRY_RUN; then
    echo "  [update] nwave/VERSION"
    echo "    tag: ${tag}"
    echo "    commit: ${commit}"
    echo "    synced_at: ${synced_at}"
  else
    printf '%s\n' "$content" > "$version_file"
    echo "  [update] nwave/VERSION"
  fi
}

sync_des() {
  local source_dir="$PROJECT_ROOT/nwave/scripts/des"
  local target_dir="$PROJECT_ROOT/src/des"

  if [[ ! -d "$source_dir" ]]; then
    echo "WARNING: DES source directory not found: $source_dir (skipping des)" >&2
    ERRORS=$((ERRORS + 1))
    return
  fi

  $DRY_RUN || mkdir -p "$target_dir"

  local source_files
  source_files="$(cd "$source_dir" && find . -type f | sort)"

  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    rel_path="${rel_path#./}"
    local src="$source_dir/$rel_path"
    local dst="$target_dir/$rel_path"
    local filename
    filename="$(basename "$rel_path")"

    # Preserve existing __init__.py (project override)
    if [[ "$filename" == "__init__.py" && -f "$dst" ]]; then
      TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
      echo "  [skip] src/des/$rel_path (project override)"
      continue
    fi

    if [[ ! -f "$dst" ]]; then
      TOTAL_ADDED=$((TOTAL_ADDED + 1))
      if $DRY_RUN; then
        echo "  [add] src/des/$rel_path"
      else
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "  [add] src/des/$rel_path"
      fi
    elif cmp -s "$src" "$dst"; then
      TOTAL_UNCHANGED=$((TOTAL_UNCHANGED + 1))
    else
      TOTAL_CHANGED=$((TOTAL_CHANGED + 1))
      if $DRY_RUN; then
        echo "  [update] src/des/$rel_path"
      else
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "  [update] src/des/$rel_path"
      fi
    fi
  done <<< "$source_files"
}

# --- Main ---

# Step 1: Fetch upstream
fetch_upstream

# Step 2: Sync
if $DRY_RUN; then
  echo "sync-nwave: DRY RUN — no files will be modified"
fi

echo "--- commands/ ---"
sync_commands

echo "--- agents/ ---"
sync_agents

echo "--- skills/ ---"
sync_skills

echo "--- src/des/ ---"
sync_des

echo "--- nwave/VERSION ---"
write_version

echo ""
echo "sync-nwave: done — added=$TOTAL_ADDED changed=$TOTAL_CHANGED unchanged=$TOTAL_UNCHANGED skipped=$TOTAL_SKIPPED errors=$ERRORS"
if $DRY_RUN; then
  echo "sync-nwave: (dry run — no files were written)"
fi
if [[ $ERRORS -gt 0 ]]; then
  echo "sync-nwave: $ERRORS source directories missing (see warnings above)" >&2
fi

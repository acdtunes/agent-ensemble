#!/usr/bin/env bash
# Validates dependency direction: des/ must never import from en/.
# en/ may import from des/.
# Exit 0 = clean, Exit 1 = violation found.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DES_DIR="$PROJECT_ROOT/src/des"

if [ ! -d "$DES_DIR" ]; then
  echo "OK: src/des/ does not exist yet — no violations possible."
  exit 0
fi

violations=$(grep -rn --include='*.py' -E '(from en\.|import en\.)' "$DES_DIR" 2>/dev/null || true)

if [ -n "$violations" ]; then
  echo "VIOLATION: des/ imports from en/ (dependency direction broken):"
  echo "$violations"
  exit 1
fi

echo "OK: No dependency direction violations found."
exit 0

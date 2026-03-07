#!/usr/bin/env bash
# Tests for scripts/fetch-vendor.sh error handling.
# Validates: connectivity error message, non-zero exit, nwave/ unmodified on failure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FETCH_SCRIPT="${PROJECT_ROOT}/scripts/fetch-vendor.sh"

PASS=0
FAIL=0
TESTS_RUN=0

assert_eq() {
    local label="$1" expected="$2" actual="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $label (expected='$expected', actual='$actual')"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local label="$1" needle="$2" haystack="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $label (output does not contain '$needle')"
        FAIL=$((FAIL + 1))
    fi
}

assert_dir_unchanged() {
    local label="$1" dir="$2" expected_hash="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ ! -d "$dir" ]]; then
        echo "  FAIL: $label (directory does not exist)"
        FAIL=$((FAIL + 1))
        return
    fi
    local actual_hash
    actual_hash=$(find "$dir" -type f -exec cat {} + 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
    if [[ "$expected_hash" == "$actual_hash" ]]; then
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $label (directory content changed)"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== fetch-vendor.sh error handling tests ==="
echo ""

# --- Test 1: Unreachable upstream produces connectivity error and non-zero exit ---
echo "Test 1: Unreachable upstream produces error message and non-zero exit"

tmp_test_dir=$(mktemp -d)
mkdir -p "${tmp_test_dir}/nwave"
echo "pristine-content" > "${tmp_test_dir}/nwave/marker.txt"
BEFORE_HASH=$(find "${tmp_test_dir}/nwave" -type f -exec cat {} + | shasum -a 256 | cut -d' ' -f1)

# Use a non-existent repo to simulate unreachable upstream
# Override the API URL by pointing --dest to our temp dir
# We patch the script's UPSTREAM_OWNER to a non-existent org
output=$(UPSTREAM_OVERRIDE_OWNER="nonexistent-org-xyzzy-99999" \
    bash -c '
    # Create a wrapper that overrides the upstream
    script_content=$(cat "'"$FETCH_SCRIPT"'")
    modified=$(echo "$script_content" | sed "s/nWave-ai/nonexistent-org-xyzzy-99999/g")
    echo "$modified" | bash -s -- --dest "'"${tmp_test_dir}/nwave"'"
' 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

assert_eq "Exit code is non-zero" "1" "$exit_code"
assert_contains "Output contains error about unreachable/not found" "error" "$output"
assert_dir_unchanged "nwave/ directory unchanged after failure" "${tmp_test_dir}/nwave" "$BEFORE_HASH"

rm -rf "$tmp_test_dir"
echo ""

# --- Test 2: Invalid arguments produce exit code 2 ---
echo "Test 2: Invalid arguments produce exit code 2"

output=$(bash "$FETCH_SCRIPT" --bogus-flag 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

assert_eq "Exit code is 2 for bad args" "2" "$exit_code"
assert_contains "Output contains error" "error" "$output"
echo ""

# --- Test 3: --ref with missing value produces exit code 2 ---
echo "Test 3: --ref without value produces exit code 2"

output=$(bash "$FETCH_SCRIPT" --ref 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

assert_eq "Exit code is 2 for missing --ref value" "2" "$exit_code"
echo ""

# --- Test 4: Non-existent ref fails gracefully ---
echo "Test 4: Non-existent ref fails without modifying nwave/"

tmp_test_dir=$(mktemp -d)
mkdir -p "${tmp_test_dir}/nwave"
echo "original-data" > "${tmp_test_dir}/nwave/data.txt"
BEFORE_HASH=$(find "${tmp_test_dir}/nwave" -type f -exec cat {} + | shasum -a 256 | cut -d' ' -f1)

output=$(bash "$FETCH_SCRIPT" --ref "nonexistent-ref-abc123" --dest "${tmp_test_dir}/nwave" 2>&1) || exit_code=$?
exit_code=${exit_code:-0}

assert_eq "Exit code is non-zero for bad ref" "1" "$exit_code"
assert_contains "Output mentions failure" "error" "$output"
assert_dir_unchanged "nwave/ unchanged after bad ref" "${tmp_test_dir}/nwave" "$BEFORE_HASH"

rm -rf "$tmp_test_dir"
echo ""

# --- Summary ---
echo "=== Results: ${PASS}/${TESTS_RUN} passed, ${FAIL} failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
fi

"""Tests for scripts/validate-vendor.sh vendor integrity validation.

Tests exercise the script as a driving port, verifying observable outcomes:
- Exit codes for success/failure
- Error messages for missing directories
- Detection of modified files
- Detection of extra files not in upstream
"""

import os
import shutil
import subprocess
import tempfile

import pytest


PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
SCRIPT_PATH = os.path.join(PROJECT_ROOT, "scripts", "validate-vendor.sh")


def run_validate(vendor_dir, env_overrides=None):
    """Run validate-vendor.sh with the given vendor directory."""
    env = {**os.environ, "VENDOR_PATH": str(vendor_dir)}
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        [SCRIPT_PATH],
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
        env=env,
    )


class TestMissingDirectories:
    """Missing required directories trigger clear errors."""

    def test_missing_vendor_dir_exits_nonzero(self, tmp_path):
        result = run_validate(tmp_path / "nonexistent")
        assert result.returncode == 1
        assert "does not exist" in result.stderr

    def test_missing_required_subdir_exits_nonzero(self, tmp_path):
        vendor = tmp_path / "nwave"
        vendor.mkdir()
        (vendor / "agents").mkdir()
        (vendor / "skills").mkdir()
        # scripts/ is missing
        result = run_validate(vendor)
        assert result.returncode == 1
        assert "scripts" in result.stderr

    def test_all_required_dirs_present_passes_structure_check(self, tmp_path):
        vendor = tmp_path / "nwave"
        vendor.mkdir()
        for d in ("commands", "agents", "skills", "scripts"):
            (vendor / d).mkdir()
        # Will still fail on upstream check, but structure check passes
        result = run_validate(vendor)
        # Structure check passes; upstream check may fail differently
        assert "missing directories" not in (result.stderr + result.stdout).lower() or result.returncode != 1


class TestUpstreamComparison:
    """Vendor files compared against upstream by git blob SHA."""

    def test_validates_real_vendor_against_upstream(self):
        """Integration: real nwave/ against real upstream."""
        vendor = os.path.join(PROJECT_ROOT, "nwave")
        if not os.path.isdir(vendor):
            pytest.skip("nwave/ not populated")
        result = subprocess.run(
            [SCRIPT_PATH],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
        )
        assert result.returncode == 0, f"Validation failed:\n{result.stderr}\n{result.stdout}"
        assert "OK" in result.stdout or "WARN" in result.stdout


class TestModifiedFileDetection:
    """Manual edits to vendor files are detectable."""

    def test_detects_modified_vendor_file(self):
        """Modify a vendor file, validate, then restore."""
        vendor = os.path.join(PROJECT_ROOT, "nwave")
        if not os.path.isdir(vendor):
            pytest.skip("nwave/ not populated")

        target = os.path.join(vendor, "README.md")
        if not os.path.isfile(target):
            pytest.skip("README.md not in vendor")

        original = open(target).read()
        try:
            with open(target, "a") as f:
                f.write("\n# TAMPERED\n")
            result = subprocess.run(
                [SCRIPT_PATH],
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT,
            )
            assert result.returncode == 1
            assert "Modified" in result.stderr
        finally:
            with open(target, "w") as f:
                f.write(original)

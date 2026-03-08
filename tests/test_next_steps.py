"""Tests for team_state next-steps subcommand.

Test Budget: 4 behaviors x 2 = 8 max unit tests.

Behaviors:
1. Returns READY for pending steps whose deps are all approved
2. Excludes in_progress/review/approved/failed steps from output
3. Returns DONE when all steps are approved
4. Output is deterministic and machine-parseable
"""

from __future__ import annotations

import textwrap

import pytest

from en.cli.team_state import _compute_ready_steps, main


# --- Fixtures ---


ROADMAP_MIXED_DEPS = textwrap.dedent("""\
    roadmap:
      project_id: test-project
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Add types
        dependencies: []
        status: approved
      - id: 01-02
        name: Add parser
        dependencies:
          - 01-01
        status: pending
      - id: 01-03
        name: Add utils
        dependencies: []
        status: pending
    - id: '02'
      name: Integration
      steps:
      - id: 02-01
        name: Add endpoint
        dependencies:
          - 01-02
          - 01-03
        status: pending
""")


ROADMAP_ALL_APPROVED = textwrap.dedent("""\
    roadmap:
      project_id: test-project
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Add types
        dependencies: []
        status: approved
      - id: 01-02
        name: Add parser
        dependencies:
          - 01-01
        status: approved
""")


# --- Acceptance: through CLI driving port ---


def test_next_steps_returns_ready_steps_with_deps_approved(tmp_path, capsys):
    """Acceptance: Steps with all deps approved and own status pending are READY."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_MIXED_DEPS)

    exit_code = main(["next-steps", str(roadmap_file)])

    assert exit_code == 0
    output = capsys.readouterr().out
    lines = [l.strip() for l in output.strip().split("\n") if l.strip()]
    assert any(l.startswith("READY 01-02 [") and "Add parser" in l for l in lines)
    assert any(l.startswith("READY 01-03 [") and "Add utils" in l for l in lines)
    assert not any("02-01" in l for l in lines)


def test_next_steps_returns_done_when_all_approved(tmp_path, capsys):
    """Acceptance: When all steps are approved, output DONE."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_ALL_APPROVED)

    exit_code = main(["next-steps", str(roadmap_file)])

    assert exit_code == 0
    output = capsys.readouterr().out.strip()
    assert output == "DONE"


# --- Unit: _compute_ready_steps direct tests ---


@pytest.mark.parametrize("excluded_status", ["in_progress", "review", "approved", "failed"])
def test_compute_ready_steps_excludes_non_pending_statuses(excluded_status):
    """Only pending steps are returned as ready; all other statuses excluded."""
    steps = [
        {"id": "01-01", "name": "Dep", "dependencies": [], "status": "approved"},
        {"id": "01-02", "name": "Target", "dependencies": ["01-01"], "status": excluded_status},
        {"id": "01-03", "name": "Free", "dependencies": [], "status": "pending"},
    ]

    ready = _compute_ready_steps(steps)

    ready_ids = [s["id"] for s in ready]
    assert "01-02" not in ready_ids
    assert "01-03" in ready_ids


def test_compute_ready_steps_blocks_on_unapproved_deps():
    """A pending step is NOT ready if any dep is not approved."""
    steps = [
        {"id": "01-01", "name": "Dep A", "dependencies": [], "status": "approved"},
        {"id": "01-02", "name": "Dep B", "dependencies": [], "status": "in_progress"},
        {"id": "02-01", "name": "Blocked", "dependencies": ["01-01", "01-02"], "status": "pending"},
    ]

    ready = _compute_ready_steps(steps)

    assert [s["id"] for s in ready] == []


def test_compute_ready_steps_returns_sorted_by_id():
    """Output is deterministic: steps sorted by ID regardless of input order."""
    steps = [
        {"id": "03-01", "name": "Third", "deps": [], "status": "pending"},
        {"id": "01-01", "name": "First", "deps": [], "status": "pending"},
        {"id": "02-01", "name": "Second", "deps": [], "status": "pending"},
    ]

    ready = _compute_ready_steps(steps)

    assert [s["id"] for s in ready] == ["01-01", "02-01", "03-01"]


def test_compute_ready_steps_supports_deps_key():
    """Supports 'deps' key as alternative to 'dependencies'."""
    steps = [
        {"id": "01-01", "name": "Base", "deps": [], "status": "approved"},
        {"id": "01-02", "name": "Next", "deps": ["01-01"], "status": "pending"},
    ]

    ready = _compute_ready_steps(steps)

    assert [s["id"] for s in ready] == ["01-02"]


def test_compute_ready_steps_excludes_steps_with_failed_dep():
    """A step whose dependency has status 'failed' is never returned."""
    steps = [
        {"id": "01-01", "name": "Failed dep", "dependencies": [], "status": "failed"},
        {"id": "01-02", "name": "Blocked by fail", "dependencies": ["01-01"], "status": "pending"},
        {"id": "01-03", "name": "Free", "dependencies": [], "status": "pending"},
    ]

    ready = _compute_ready_steps(steps)

    ready_ids = [s["id"] for s in ready]
    assert "01-02" not in ready_ids
    assert "01-03" in ready_ids


ROADMAP_WITH_CONFLICTS = textwrap.dedent("""\
    roadmap:
      project_id: test-project
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Active step
        dependencies: []
        status: in_progress
        files_to_modify:
          - src/shared.py
      - id: 01-02
        name: Conflicting step
        dependencies: []
        status: pending
        files_to_modify:
          - src/shared.py
      - id: 01-03
        name: Non-conflicting step
        dependencies: []
        status: pending
        files_to_modify:
          - src/other.py
""")


def test_next_steps_annotates_worktree_for_conflicting_steps(tmp_path, capsys):
    """Steps conflicting with active steps are annotated WORKTREE."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_CONFLICTS)

    exit_code = main(["next-steps", str(roadmap_file)])

    assert exit_code == 0
    output = capsys.readouterr().out
    lines = [l.strip() for l in output.strip().split("\n") if l.strip()]
    # 01-02 conflicts with active 01-01 on src/shared.py
    assert any("[WORKTREE" in l and "01-02" in l for l in lines)
    # 01-03 does not conflict
    assert any("[SHARED]" in l and "01-03" in l for l in lines)

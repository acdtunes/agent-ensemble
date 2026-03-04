"""Tests for team_state CLI module — unified roadmap.yaml read/write.

Test Budget: 7 behaviors x 2 = 14 max unit tests.

Behaviors:
1. update finds step across phases and updates status
2. update sets timestamp fields (started_at, completed_at)
3. update sets teammate_id
4. update increments review_attempts on review status
5. update errors on invalid step/status/missing file
6. check reports phase completion status
7. init command removed
"""

from __future__ import annotations

import textwrap

import pytest

from agent_ensemble.cli.team_state import main


# --- Fixtures ---


ROADMAP_WITH_COMMENTS = textwrap.dedent("""\
    # Project roadmap
    roadmap:
      project_id: test-project
      created_at: '2026-03-01T00:00:00Z'
      total_steps: 3
      phases: 2
    phases:
    - id: '01'
      name: Foundation
      # Phase 1 comment
      steps:
      - id: 01-01
        name: Add types
        files_to_modify:
          - src/types.ts
        dependencies: []
        criteria:
          - Types defined correctly
      - id: 01-02
        name: Add parser
        files_to_modify:
          - src/parser.ts
        dependencies:
          - 01-01
        criteria:
          - Parser works
    - id: '02'
      name: Integration
      steps:
      - id: 02-01
        name: Add endpoint
        files_to_modify:
          - src/server.ts
        dependencies:
          - 01-02
        criteria:
          - Endpoint returns data
""")


# --- Acceptance: update writes status to roadmap.yaml in-place ---


def test_update_writes_status_to_roadmap_step_and_preserves_comments(tmp_path):
    """Acceptance: update command reads roadmap.yaml, finds step across phases,
    updates status, writes back preserving YAML comments."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    exit_code = main(["update", str(roadmap_file), "--step", "02-01", "--status", "claimed", "--teammate", "crafter-02-01"])

    assert exit_code == 0

    content = roadmap_file.read_text()

    # Status written in-place
    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(content)
    step = None
    for phase in data["phases"]:
        for s in phase["steps"]:
            if s["id"] == "02-01":
                step = s
                break
    assert step is not None
    assert step["status"] == "claimed"
    assert step["teammate_id"] == "crafter-02-01"
    assert step["started_at"] is not None

    # Comments preserved
    assert "# Project roadmap" in content
    assert "# Phase 1 comment" in content


# --- Acceptance: show computes summary from roadmap ---


def test_show_displays_summary_computed_from_roadmap_statuses(tmp_path, capsys):
    """Acceptance: show command reads roadmap.yaml, computes summary from step statuses."""
    roadmap_content = textwrap.dedent("""\
        roadmap:
          project_id: test-project
        phases:
        - id: '01'
          name: Foundation
          steps:
          - id: 01-01
            name: Add types
            status: approved
            teammate_id: crafter-01
          - id: 01-02
            name: Add parser
            status: in_progress
            teammate_id: crafter-02
        - id: '02'
          name: Integration
          steps:
          - id: 02-01
            name: Add endpoint
    """)
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(roadmap_content)

    exit_code = main(["show", str(roadmap_file)])

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "1/3 completed" in output or "1/3" in output
    assert "01-01" in output
    assert "01-02" in output
    assert "02-01" in output


# --- Acceptance: check reports phase completion ---


def test_check_reports_phase_complete_when_all_steps_approved(tmp_path, capsys):
    """Acceptance: check command reads roadmap.yaml, checks phase completion."""
    roadmap_content = textwrap.dedent("""\
        roadmap:
          project_id: test-project
        phases:
        - id: '01'
          name: Foundation
          steps:
          - id: 01-01
            name: Add types
            status: approved
          - id: 01-02
            name: Add parser
            status: approved
        - id: '02'
          name: Integration
          steps:
          - id: 02-01
            name: Add endpoint
    """)
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(roadmap_content)

    exit_code = main(["check", str(roadmap_file), "--phase", "01"])

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "COMPLETE" in output


# --- Acceptance: init command removed ---


def test_init_command_returns_usage_error(capsys):
    """Acceptance: init command no longer exists."""
    exit_code = main(["init", "--plan", "plan.yaml", "--output", "state.yaml"])

    assert exit_code == 2
    output = capsys.readouterr().err
    assert "Unknown" in output or "unknown" in output.lower()


# --- Unit: update finds step across phases ---


def test_update_finds_step_in_second_phase(tmp_path):
    """Step found by searching across all phases (not flat dict lookup)."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    exit_code = main(["update", str(roadmap_file), "--step", "02-01", "--status", "in_progress"])

    assert exit_code == 0
    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())
    step = data["phases"][1]["steps"][0]
    assert step["status"] == "in_progress"


def test_update_errors_on_unknown_step(tmp_path, capsys):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    exit_code = main(["update", str(roadmap_file), "--step", "99-99", "--status", "claimed"])

    assert exit_code == 1
    assert "not found" in capsys.readouterr().err.lower()


# --- Unit: update sets timestamps ---


@pytest.mark.parametrize("status,timestamp_field", [
    ("claimed", "started_at"),
    ("approved", "completed_at"),
])
def test_update_sets_timestamp_on_status_transition(tmp_path, status, timestamp_field):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    main(["update", str(roadmap_file), "--step", "01-01", "--status", status])

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())
    step = data["phases"][0]["steps"][0]
    assert step[timestamp_field] is not None


# --- Unit: update sets teammate_id ---


def test_update_sets_teammate_id(tmp_path):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    main(["update", str(roadmap_file), "--step", "01-01", "--status", "claimed", "--teammate", "crafter-01"])

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())
    step = data["phases"][0]["steps"][0]
    assert step["teammate_id"] == "crafter-01"


# --- Unit: update increments review_attempts ---


def test_update_increments_review_attempts_on_review_status(tmp_path):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    main(["update", str(roadmap_file), "--step", "01-01", "--status", "review"])
    main(["update", str(roadmap_file), "--step", "01-01", "--status", "review"])

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())
    step = data["phases"][0]["steps"][0]
    assert step["review_attempts"] == 2


# --- Unit: update validation ---


@pytest.mark.parametrize("invalid_status", ["unknown", "done", ""])
def test_update_rejects_invalid_status(tmp_path, capsys, invalid_status):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    exit_code = main(["update", str(roadmap_file), "--step", "01-01", "--status", invalid_status])

    assert exit_code == 2


def test_update_errors_on_missing_file(tmp_path, capsys):
    exit_code = main(["update", str(tmp_path / "missing.yaml"), "--step", "01-01", "--status", "claimed"])

    assert exit_code == 2
    assert "not found" in capsys.readouterr().err.lower()


# --- Unit: check phase completion ---


def test_check_returns_1_when_phase_incomplete(tmp_path, capsys):
    roadmap_content = textwrap.dedent("""\
        roadmap:
          project_id: test
        phases:
        - id: '01'
          name: P1
          steps:
          - id: 01-01
            name: S1
            status: approved
          - id: 01-02
            name: S2
            status: in_progress
    """)
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(roadmap_content)

    exit_code = main(["check", str(roadmap_file), "--phase", "01"])

    assert exit_code == 1
    assert "IN PROGRESS" in capsys.readouterr().out


def test_check_errors_on_unknown_phase(tmp_path, capsys):
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_COMMENTS)

    exit_code = main(["check", str(roadmap_file), "--phase", "99"])

    assert exit_code == 2

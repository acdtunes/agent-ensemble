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

from en.cli.team_state import main


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


# --- Acceptance: start-step writes conflicts_with for file overlap ---


ROADMAP_WITH_FILE_CONFLICTS = textwrap.dedent("""\
    roadmap:
      project_id: conflict-test
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Add auth
        files_to_modify:
          - src/auth.ts
          - src/utils.ts
        status: in_progress
        teammate_id: crafter-01
      - id: 01-02
        name: Add api
        files_to_modify:
          - src/auth.ts
          - src/api.ts
      - id: 01-03
        name: Add tests
        files_to_modify:
          - tests/auth.test.ts
""")


def test_start_step_writes_conflicts_with_for_file_overlap(tmp_path):
    """Acceptance: Starting step with file overlap writes conflicts_with array
    containing IDs of conflicting active steps, and updates those steps mutually."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_FILE_CONFLICTS)

    exit_code = main(["start-step", str(roadmap_file), "--step", "01-02", "--teammate", "crafter-02"])

    assert exit_code == 0

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())

    # Find steps
    step_01 = data["phases"][0]["steps"][0]  # 01-01
    step_02 = data["phases"][0]["steps"][1]  # 01-02

    # New step has conflicts_with pointing to active conflicting step
    assert step_02.get("conflicts_with") == ["01-01"]

    # Active step updated with mutual reference
    assert "01-02" in step_01.get("conflicts_with", [])


def test_start_step_no_conflicts_with_when_no_file_overlap(tmp_path):
    """Acceptance: Starting step with no file overlap does not write conflicts_with."""
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_FILE_CONFLICTS)

    exit_code = main(["start-step", str(roadmap_file), "--step", "01-03", "--teammate", "crafter-03"])

    assert exit_code == 0

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())

    step_03 = data["phases"][0]["steps"][2]  # 01-03

    # No conflicts_with field when no overlap
    assert "conflicts_with" not in step_03


# --- Unit: _compute_conflicting_step_ids pure function ---


def test_compute_conflicting_step_ids_returns_ids_of_overlapping_active_steps():
    """Unit: Pure function returns list of step IDs that share files."""
    from en.cli.team_state import _compute_conflicting_step_ids

    step = {"id": "02-01", "files_to_modify": ["src/auth.ts", "src/api.ts"]}
    active_steps = [
        {"id": "01-01", "files_to_modify": ["src/auth.ts", "src/utils.ts"]},
        {"id": "01-02", "files_to_modify": ["src/db.ts"]},
        {"id": "01-03", "files_to_modify": ["src/api.ts"]},
    ]

    result = _compute_conflicting_step_ids(step, active_steps)

    assert sorted(result) == ["01-01", "01-03"]


def test_compute_conflicting_step_ids_excludes_self():
    """Unit: Function excludes the step itself from conflicts."""
    from en.cli.team_state import _compute_conflicting_step_ids

    step = {"id": "01-01", "files_to_modify": ["src/auth.ts"]}
    active_steps = [
        {"id": "01-01", "files_to_modify": ["src/auth.ts"]},
        {"id": "01-02", "files_to_modify": ["src/auth.ts"]},
    ]

    result = _compute_conflicting_step_ids(step, active_steps)

    assert result == ["01-02"]


def test_compute_conflicting_step_ids_returns_empty_for_no_overlap():
    """Unit: Function returns empty list when no file overlap exists."""
    from en.cli.team_state import _compute_conflicting_step_ids

    step = {"id": "02-01", "files_to_modify": ["src/new.ts"]}
    active_steps = [
        {"id": "01-01", "files_to_modify": ["src/auth.ts"]},
    ]

    result = _compute_conflicting_step_ids(step, active_steps)

    assert result == []


# --- Unit: _clear_conflict_references pure function ---


def test_clear_conflict_references_removes_step_id_from_other_steps():
    """Unit: Pure function removes step ID from all steps' conflicts_with arrays."""
    from en.cli.team_state import _clear_conflict_references

    steps = [
        {"id": "01-01", "conflicts_with": ["01-02"]},
        {"id": "01-02", "conflicts_with": ["01-01"]},
        {"id": "01-03", "conflicts_with": ["01-01", "01-02"]},
    ]

    result = _clear_conflict_references(steps, "01-02")

    assert "conflicts_with" not in result[0]  # 01-01 had only 01-02
    assert "conflicts_with" not in result[1]  # 01-02 had its conflicts cleared
    assert result[2].get("conflicts_with") == ["01-01"]  # 01-03 still has 01-01


def test_clear_conflict_references_handles_steps_without_conflicts_with():
    """Unit: Function handles steps that don't have conflicts_with field."""
    from en.cli.team_state import _clear_conflict_references

    steps = [
        {"id": "01-01"},
        {"id": "01-02", "conflicts_with": ["01-01"]},
    ]

    result = _clear_conflict_references(steps, "01-01")

    assert "conflicts_with" not in result[0]
    assert "conflicts_with" not in result[1]  # Became empty, removed


# --- Acceptance: complete-step clears conflicts_with ---


ROADMAP_WITH_MUTUAL_CONFLICTS = textwrap.dedent("""\
    roadmap:
      project_id: conflict-clear-test
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Add auth
        files_to_modify:
          - src/auth.ts
        status: in_progress
        teammate_id: crafter-01
        conflicts_with:
          - 01-02
      - id: 01-02
        name: Add api
        files_to_modify:
          - src/auth.ts
        status: review
        teammate_id: crafter-02
        conflicts_with:
          - 01-01
      - id: 01-03
        name: Add tests
        files_to_modify:
          - src/auth.ts
        status: in_progress
        teammate_id: crafter-03
        conflicts_with:
          - 01-01
          - 01-02
""")


def test_complete_step_clears_all_conflict_references(tmp_path):
    """Acceptance: Completing a step clears its conflicts_with and removes its ID from others.

    Verifies:
    - Completed step has conflicts_with removed
    - Completed step ID removed from other steps' conflicts_with arrays
    - Steps with no remaining conflicts have conflicts_with field removed entirely
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_MUTUAL_CONFLICTS)

    exit_code = main(["complete-step", str(roadmap_file), "--step", "01-02"])

    assert exit_code == 0

    from ruamel.yaml import YAML
    yaml = YAML()
    data = yaml.load(roadmap_file.read_text())

    step_01 = data["phases"][0]["steps"][0]  # 01-01
    step_02 = data["phases"][0]["steps"][1]  # 01-02
    step_03 = data["phases"][0]["steps"][2]  # 01-03

    # Completed step has conflicts_with removed
    assert "conflicts_with" not in step_02

    # Step 01-01 had only 01-02 in conflicts_with, field removed entirely
    assert "conflicts_with" not in step_01

    # Step 01-03 had [01-01, 01-02], now only has 01-01
    assert step_03.get("conflicts_with") == ["01-01"]


# --- Acceptance: JSON roadmap format support ---


ROADMAP_JSON_CONTENT = {
    "roadmap": {
        "project_id": "json-test-project",
        "created_at": "2026-03-01T00:00:00Z",
    },
    "phases": [
        {
            "id": "01",
            "name": "Foundation",
            "steps": [
                {
                    "id": "01-01",
                    "name": "Add types",
                    "files_to_modify": ["src/types.ts"],
                    "dependencies": [],
                },
                {
                    "id": "01-02",
                    "name": "Add parser",
                    "files_to_modify": ["src/parser.ts"],
                    "dependencies": ["01-01"],
                },
            ],
        }
    ],
}


def test_update_works_with_json_roadmap(tmp_path):
    """Acceptance: update command reads/writes JSON roadmap files."""
    import json
    roadmap_file = tmp_path / "roadmap.json"
    roadmap_file.write_text(json.dumps(ROADMAP_JSON_CONTENT, indent=2))

    exit_code = main(["update", str(roadmap_file), "--step", "01-01", "--status", "claimed", "--teammate", "crafter-01"])

    assert exit_code == 0

    data = json.loads(roadmap_file.read_text())
    step = data["phases"][0]["steps"][0]
    assert step["status"] == "claimed"
    assert step["teammate_id"] == "crafter-01"
    assert step["started_at"] is not None


def test_complete_step_works_with_json_roadmap(tmp_path):
    """Acceptance: complete-step command reads/writes JSON roadmap files."""
    import json
    roadmap_content = {
        "roadmap": {"project_id": "json-complete-test"},
        "phases": [{
            "id": "01",
            "name": "Phase 1",
            "steps": [{
                "id": "01-01",
                "name": "Step 1",
                "status": "review",
                "teammate_id": "crafter-01",
                "files_to_modify": [],
            }],
        }],
    }
    roadmap_file = tmp_path / "roadmap.json"
    roadmap_file.write_text(json.dumps(roadmap_content, indent=2))

    exit_code = main(["complete-step", str(roadmap_file), "--step", "01-01"])

    assert exit_code == 0

    data = json.loads(roadmap_file.read_text())
    step = data["phases"][0]["steps"][0]
    assert step["status"] == "approved"
    assert step["completed_at"] is not None

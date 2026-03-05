"""Tests for migrate_roadmap CLI module.

Behaviors:
1. detect_format distinguishes Style A from Style B
2. normalize_style_a restructures to Style B format
3. derive_step_statuses maps execution-log events to step statuses
4. embed_statuses merges statuses into roadmap steps
5. main CLI: single file migration
6. main CLI: --scan finds and migrates recursively
7. main CLI: --dry-run shows changes without writing
8. main CLI: skips already-normalized files
"""

from __future__ import annotations

import textwrap

import pytest

from agent_ensemble.cli.migrate_roadmap import (
    StepStatus,
    detect_format,
    derive_step_statuses,
    embed_statuses,
    main,
    normalize_style_a,
)


# --- Fixtures ---

STYLE_A_DATA = {
    "feature_id": "card-redesign",
    "name": "Card Redesign",
    "description": "Redesign kanban board cards",
    "phases": [
        {
            "phase_id": "01",
            "name": "Foundation",
            "description": "Base work",
            "steps": [
                {
                    "step_id": "01-01",
                    "name": "Add types",
                    "description": "Add type definitions",
                    "files_to_modify": ["src/types.ts"],
                    "blocked_by": [],
                    "acceptance_criteria": ["Types defined correctly"],
                },
                {
                    "step_id": "01-02",
                    "name": "Add parser",
                    "files_to_modify": ["src/parser.ts"],
                    "blocked_by": ["01-01"],
                    "acceptance_criteria": ["Parser works"],
                },
            ],
        },
    ],
}

STYLE_B_DATA = {
    "roadmap": {"project_id": "test-project"},
    "phases": [
        {
            "id": "01",
            "name": "Foundation",
            "steps": [
                {
                    "id": "01-01",
                    "name": "Add types",
                    "dependencies": [],
                    "criteria": ["Types defined correctly"],
                },
            ],
        },
    ],
}

EXECUTION_EVENTS = [
    {"sid": "01-01", "p": "PREPARE", "s": "EXECUTED", "t": "2026-03-02T18:50:32Z"},
    {"sid": "01-01", "p": "RED_UNIT", "s": "EXECUTED", "t": "2026-03-02T18:50:42Z"},
    {"sid": "01-01", "p": "COMMIT", "s": "EXECUTED", "t": "2026-03-02T18:51:35Z"},
    {"sid": "01-02", "p": "PREPARE", "s": "EXECUTED", "t": "2026-03-02T18:53:45Z"},
    {"sid": "01-02", "p": "GREEN", "s": "FAILED", "t": "2026-03-02T18:57:06Z"},
]

STYLE_A_YAML = textwrap.dedent("""\
    feature_id: card-redesign
    name: Card Redesign
    description: Redesign kanban board cards
    phases:
    - phase_id: '01'
      name: Foundation
      steps:
      - step_id: '01-01'
        name: Add types
        blocked_by: []
        acceptance_criteria:
          - Types defined correctly
      - step_id: '01-02'
        name: Add parser
        blocked_by:
          - '01-01'
        acceptance_criteria:
          - Parser works
""")

STYLE_B_YAML = textwrap.dedent("""\
    roadmap:
      project_id: test-project
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-01
        name: Add types
        dependencies: []
        criteria:
          - Types defined correctly
""")


# --- detect_format ---


class TestDetectFormat:
    def test_detects_style_a_by_feature_id(self):
        assert detect_format(STYLE_A_DATA) == "style_a"

    def test_detects_style_b_with_roadmap_wrapper(self):
        assert detect_format(STYLE_B_DATA) == "style_b"

    def test_detects_style_a_by_phase_id_without_feature_id(self):
        data = {"phases": [{"phase_id": "01", "name": "Foundation", "steps": []}]}
        assert detect_format(data) == "style_a"

    def test_detects_style_b_for_empty_phases(self):
        assert detect_format({"phases": []}) == "style_b"


# --- normalize_style_a ---


class TestNormalizeStyleA:
    def test_renames_feature_id_to_project_id(self):
        result = normalize_style_a(STYLE_A_DATA)
        assert result["roadmap"]["project_id"] == "card-redesign"

    def test_renames_phase_id_to_id(self):
        result = normalize_style_a(STYLE_A_DATA)
        assert result["phases"][0]["id"] == "01"
        assert "phase_id" not in result["phases"][0]

    def test_renames_step_id_to_id(self):
        result = normalize_style_a(STYLE_A_DATA)
        step = result["phases"][0]["steps"][0]
        assert step["id"] == "01-01"
        assert "step_id" not in step

    def test_renames_blocked_by_to_dependencies(self):
        result = normalize_style_a(STYLE_A_DATA)
        step = result["phases"][0]["steps"][1]
        assert step["dependencies"] == ["01-01"]
        assert "blocked_by" not in step

    def test_renames_acceptance_criteria_to_criteria(self):
        result = normalize_style_a(STYLE_A_DATA)
        step = result["phases"][0]["steps"][0]
        assert step["criteria"] == ["Types defined correctly"]
        assert "acceptance_criteria" not in step

    def test_preserves_description_fields(self):
        result = normalize_style_a(STYLE_A_DATA)
        assert result["phases"][0]["description"] == "Base work"
        assert result["phases"][0]["steps"][0]["description"] == "Add type definitions"

    def test_preserves_files_to_modify(self):
        result = normalize_style_a(STYLE_A_DATA)
        assert result["phases"][0]["steps"][0]["files_to_modify"] == ["src/types.ts"]


# --- derive_step_statuses ---


class TestDeriveStepStatuses:
    def test_commit_executed_yields_approved(self):
        statuses = derive_step_statuses(EXECUTION_EVENTS)
        assert statuses["01-01"].status == "approved"

    def test_failed_event_yields_failed(self):
        statuses = derive_step_statuses(EXECUTION_EVENTS)
        assert statuses["01-02"].status == "failed"

    def test_started_at_is_first_event(self):
        statuses = derive_step_statuses(EXECUTION_EVENTS)
        assert statuses["01-01"].started_at == "2026-03-02T18:50:32Z"

    def test_completed_at_from_commit_event(self):
        statuses = derive_step_statuses(EXECUTION_EVENTS)
        assert statuses["01-01"].completed_at == "2026-03-02T18:51:35Z"

    def test_no_completed_at_when_failed(self):
        statuses = derive_step_statuses(EXECUTION_EVENTS)
        assert statuses["01-02"].completed_at is None

    def test_in_progress_without_commit_or_failure(self):
        events = [
            {"sid": "03-01", "p": "PREPARE", "s": "EXECUTED", "t": "2026-03-02T19:00:00Z"},
            {"sid": "03-01", "p": "RED_UNIT", "s": "EXECUTED", "t": "2026-03-02T19:01:00Z"},
        ]
        statuses = derive_step_statuses(events)
        assert statuses["03-01"].status == "in_progress"

    def test_empty_events_returns_empty(self):
        assert derive_step_statuses([]) == {}


# --- embed_statuses ---


class TestEmbedStatuses:
    def test_adds_status_to_matching_step(self):
        statuses = {"01-01": StepStatus(status="approved", started_at="t1", completed_at="t2")}
        result = embed_statuses(STYLE_B_DATA, statuses)
        step = result["phases"][0]["steps"][0]
        assert step["status"] == "approved"
        assert step["started_at"] == "t1"
        assert step["completed_at"] == "t2"

    def test_does_not_modify_original(self):
        statuses = {"01-01": StepStatus(status="approved")}
        embed_statuses(STYLE_B_DATA, statuses)
        assert "status" not in STYLE_B_DATA["phases"][0]["steps"][0]

    def test_skips_unmatched_steps(self):
        statuses = {"99-99": StepStatus(status="approved")}
        result = embed_statuses(STYLE_B_DATA, statuses)
        step = result["phases"][0]["steps"][0]
        assert "status" not in step

    def test_empty_statuses_returns_data_unchanged(self):
        result = embed_statuses(STYLE_B_DATA, {})
        assert result is STYLE_B_DATA


# --- CLI integration ---


class TestMainCLI:
    def test_single_file_style_a_migration(self, tmp_path):
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_A_YAML)

        result = main([str(roadmap)])
        assert result == 0

        from ruamel.yaml import YAML
        yaml = YAML()
        migrated = yaml.load(roadmap.read_text())

        assert "roadmap" in migrated
        assert migrated["roadmap"]["project_id"] == "card-redesign"
        assert migrated["phases"][0]["id"] == "01"
        assert migrated["phases"][0]["steps"][0]["id"] == "01-01"
        assert migrated["phases"][0]["steps"][0]["criteria"] == ["Types defined correctly"]
        assert migrated["phases"][0]["steps"][1]["dependencies"] == ["01-01"]

    def test_single_file_already_normalized(self, tmp_path, capsys):
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_B_YAML)

        result = main([str(roadmap)])
        assert result == 0
        assert "SKIP" in capsys.readouterr().out

    def test_dry_run_does_not_write(self, tmp_path, capsys):
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_A_YAML)
        original = roadmap.read_text()

        result = main([str(roadmap), "--dry-run"])
        assert result == 0
        assert "WOULD MIGRATE" in capsys.readouterr().out
        assert roadmap.read_text() == original

    def test_scan_finds_and_migrates(self, tmp_path, capsys):
        feature_a = tmp_path / "feature-a"
        feature_a.mkdir()
        (feature_a / "roadmap.yaml").write_text(STYLE_A_YAML)

        feature_b = tmp_path / "feature-b"
        feature_b.mkdir()
        (feature_b / "roadmap.yaml").write_text(STYLE_B_YAML)

        result = main(["--scan", str(tmp_path)])
        assert result == 0
        output = capsys.readouterr().out
        assert "MIGRATED" in output
        assert "SKIP" in output

    def test_scan_skips_node_modules(self, tmp_path, capsys):
        nm = tmp_path / "node_modules" / "pkg"
        nm.mkdir(parents=True)
        (nm / "roadmap.yaml").write_text(STYLE_A_YAML)

        result = main(["--scan", str(tmp_path)])
        assert result == 0
        assert "No roadmap.yaml" in capsys.readouterr().out

    def test_embeds_execution_log_statuses(self, tmp_path):
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_A_YAML)

        log_yaml = textwrap.dedent("""\
            project_id: card-redesign
            schema_version: '3.0'
            events:
            - sid: '01-01'
              p: PREPARE
              s: EXECUTED
              t: '2026-03-02T18:50:32Z'
            - sid: '01-01'
              p: COMMIT
              s: EXECUTED
              t: '2026-03-02T18:51:35Z'
        """)
        (tmp_path / "execution-log.yaml").write_text(log_yaml)

        main([str(roadmap)])

        from ruamel.yaml import YAML
        yaml = YAML()
        migrated = yaml.load(roadmap.read_text())

        step = migrated["phases"][0]["steps"][0]
        assert step["status"] == "approved"
        assert step["started_at"] == "2026-03-02T18:50:32Z"
        assert step["completed_at"] == "2026-03-02T18:51:35Z"

    def test_file_not_found(self, capsys):
        result = main(["/nonexistent/roadmap.yaml"])
        assert result == 1

    def test_no_args_shows_usage(self, capsys):
        result = main([])
        assert result == 2

    def test_output_format_json_writes_to_deliver_directory(self, tmp_path):
        """AC: migrate_roadmap.py supports --output-format json flag."""
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_A_YAML)

        result = main([str(roadmap), "--output-format", "json"])
        assert result == 0

        # Should create deliver/roadmap.json
        json_path = tmp_path / "deliver" / "roadmap.json"
        assert json_path.exists()

        import json

        migrated = json.loads(json_path.read_text())
        assert migrated["roadmap"]["project_id"] == "card-redesign"
        assert migrated["phases"][0]["id"] == "01"

    def test_yaml_loading_emits_deprecation_warning(self, tmp_path, capsys):
        """AC: CLI tools emit deprecation warning when loading roadmap.yaml."""
        roadmap = tmp_path / "roadmap.yaml"
        roadmap.write_text(STYLE_B_YAML)

        result = main([str(roadmap)])
        assert result == 0

        stderr = capsys.readouterr().err
        assert "deprecated" in stderr.lower() or "DEPRECATION" in stderr

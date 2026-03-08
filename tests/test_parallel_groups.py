"""Tests for parallel_groups CLI module."""

import json
from pathlib import Path

import pytest
from ruamel.yaml import YAML

from en.cli.parallel_groups import (
    Step,
    cmd_analyze,
    extract_steps,
    identify_parallel_groups,
)


# --- Unit: extract_steps reads description ---


def test_extract_steps_reads_description_from_yaml():
    roadmap = {
        "roadmap": {"project_id": "test"},
        "phases": [
            {
                "id": "01",
                "steps": [
                    {
                        "id": "01-01",
                        "name": "Do thing",
                        "description": "Detailed explanation",
                        "files_to_modify": ["src/thing.py"],
                        "deps": [],
                    },
                ],
            },
        ],
    }

    steps = extract_steps(roadmap)

    assert steps[0].description == "Detailed explanation"


def test_extract_steps_defaults_description_when_missing():
    roadmap = {
        "roadmap": {"project_id": "test"},
        "phases": [
            {
                "id": "01",
                "steps": [
                    {
                        "id": "01-01",
                        "name": "Do thing",
                        "files_to_modify": ["src/thing.py"],
                        "deps": [],
                    },
                ],
            },
        ],
    }

    steps = extract_steps(roadmap)

    assert steps[0].description == ""


# --- Validation: files_to_modify must not be empty ---


def test_extract_steps_rejects_empty_files_to_modify():
    roadmap = {
        "roadmap": {"project_id": "test"},
        "phases": [
            {
                "id": "01",
                "steps": [
                    {
                        "id": "01-01",
                        "name": "Missing files",
                        "files_to_modify": [],
                        "deps": [],
                    },
                ],
            },
        ],
    }

    with pytest.raises(ValueError, match="empty files_to_modify"):
        extract_steps(roadmap)


# --- Parallel groups analysis ---


def test_identify_parallel_groups_builds_layers():
    roadmap = {
        "roadmap": {"project_id": "test"},
        "phases": [
            {
                "id": "01",
                "steps": [
                    {
                        "id": "01-01",
                        "name": "First",
                        "files_to_modify": ["a.py"],
                        "deps": [],
                    },
                    {
                        "id": "01-02",
                        "name": "Second",
                        "files_to_modify": ["b.py"],
                        "deps": ["01-01"],
                    },
                ],
            },
        ],
    }

    steps = extract_steps(roadmap)
    groups = identify_parallel_groups(steps)

    assert len(groups) == 2
    assert len(groups[0].steps) == 1
    assert groups[0].steps[0].step_id == "01-01"
    assert len(groups[1].steps) == 1
    assert groups[1].steps[0].step_id == "01-02"


# --- Acceptance: Format-agnostic roadmap loading ---


ROADMAP_DATA = {
    "roadmap": {"project_id": "test-format-agnostic"},
    "phases": [
        {
            "id": "01",
            "name": "Phase One",
            "steps": [
                {
                    "id": "01-01",
                    "name": "First step",
                    "files_to_modify": ["src/a.py"],
                    "deps": [],
                },
                {
                    "id": "01-02",
                    "name": "Second step",
                    "files_to_modify": ["src/b.py"],
                    "deps": ["01-01"],
                },
            ],
        },
    ],
}


def test_cmd_analyze_loads_yaml_via_roadmap_adapter(tmp_path: Path, capsys):
    """Acceptance: cmd_analyze uses roadmap_adapter for YAML files."""
    yaml_file = tmp_path / "roadmap.yaml"
    yaml = YAML()
    with open(yaml_file, "w") as f:
        yaml.dump(ROADMAP_DATA, f)

    result = cmd_analyze([str(yaml_file)])

    assert result == 0
    captured = capsys.readouterr()
    assert "Total steps: 2" in captured.out
    assert "Layers: 2" in captured.out


def test_cmd_analyze_loads_json_via_roadmap_adapter(tmp_path: Path, capsys):
    """Acceptance: cmd_analyze uses roadmap_adapter for JSON files."""
    json_file = tmp_path / "roadmap.json"
    json_file.write_text(json.dumps(ROADMAP_DATA, indent=2))

    result = cmd_analyze([str(json_file)])

    assert result == 0
    captured = capsys.readouterr()
    assert "Total steps: 2" in captured.out
    assert "Layers: 2" in captured.out


def test_cmd_analyze_produces_identical_results_for_yaml_and_json(tmp_path: Path, capsys):
    """Acceptance: Dependency analysis identical regardless of source format."""
    yaml_file = tmp_path / "roadmap.yaml"
    json_file = tmp_path / "roadmap.json"

    yaml = YAML()
    with open(yaml_file, "w") as f:
        yaml.dump(ROADMAP_DATA, f)
    json_file.write_text(json.dumps(ROADMAP_DATA, indent=2))

    # Analyze YAML
    cmd_analyze([str(yaml_file)])
    yaml_output = capsys.readouterr().out

    # Analyze JSON
    cmd_analyze([str(json_file)])
    json_output = capsys.readouterr().out

    # Compare outputs (should be identical)
    assert yaml_output == json_output


def test_cmd_analyze_rejects_unrecognized_format(tmp_path: Path, capsys):
    """Acceptance: cmd_analyze uses adapter - adapter rejects unrecognized extensions."""
    txt_file = tmp_path / "roadmap.txt"
    txt_file.write_text(json.dumps(ROADMAP_DATA, indent=2))

    result = cmd_analyze([str(txt_file)])

    # Should fail with error (adapter raises ValueError for unrecognized format)
    assert result != 0
    captured = capsys.readouterr()
    assert "Unrecognized roadmap format" in captured.err

"""Tests for roadmap_adapter module.

Behaviors:
1. load_roadmap returns (data, format) tuple for both .yaml and .json files
2. detect_format finds roadmap in deliver/roadmap.json, roadmap.json, or roadmap.yaml (priority order)
3. save_roadmap preserves YAML comments when writing YAML format
4. migrate_yaml_to_json converts existing YAML to JSON in deliver/ subdirectory

Test Budget: 4 behaviors x 2 = 8 unit tests maximum
"""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from en.adapters.roadmap_adapter import (
    detect_format,
    load_roadmap,
    migrate_yaml_to_json,
    save_roadmap,
)


# --- Fixtures ---

SAMPLE_ROADMAP_DATA = {
    "roadmap": {
        "project_id": "test-project",
        "short_description": "Test project description",
    },
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

SAMPLE_YAML = textwrap.dedent("""\
    # Project roadmap with comments
    roadmap:
      project_id: test-project
      short_description: Test project description
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

SAMPLE_JSON = json.dumps(SAMPLE_ROADMAP_DATA, indent=2)


# --- detect_format: finds roadmap in priority order ---


class TestDetectFormat:
    def test_finds_deliver_roadmap_json_first(self, tmp_path: Path):
        deliver = tmp_path / "deliver"
        deliver.mkdir()
        (deliver / "roadmap.json").write_text(SAMPLE_JSON)
        (tmp_path / "roadmap.json").write_text(SAMPLE_JSON)
        (tmp_path / "roadmap.yaml").write_text(SAMPLE_YAML)

        path, fmt = detect_format(tmp_path)

        assert path == deliver / "roadmap.json"
        assert fmt == "json"

    def test_finds_roadmap_json_second(self, tmp_path: Path):
        (tmp_path / "roadmap.json").write_text(SAMPLE_JSON)
        (tmp_path / "roadmap.yaml").write_text(SAMPLE_YAML)

        path, fmt = detect_format(tmp_path)

        assert path == tmp_path / "roadmap.json"
        assert fmt == "json"

    def test_finds_roadmap_yaml_last(self, tmp_path: Path):
        (tmp_path / "roadmap.yaml").write_text(SAMPLE_YAML)

        path, fmt = detect_format(tmp_path)

        assert path == tmp_path / "roadmap.yaml"
        assert fmt == "yaml"

    def test_returns_none_when_no_roadmap(self, tmp_path: Path):
        result = detect_format(tmp_path)

        assert result is None


# --- load_roadmap: returns (data, format) tuple ---


class TestLoadRoadmap:
    def test_loads_yaml_file(self, tmp_path: Path):
        roadmap_path = tmp_path / "roadmap.yaml"
        roadmap_path.write_text(SAMPLE_YAML)

        data, fmt = load_roadmap(roadmap_path)

        assert fmt == "yaml"
        assert data["roadmap"]["project_id"] == "test-project"
        assert data["phases"][0]["id"] == "01"

    def test_loads_json_file(self, tmp_path: Path):
        roadmap_path = tmp_path / "roadmap.json"
        roadmap_path.write_text(SAMPLE_JSON)

        data, fmt = load_roadmap(roadmap_path)

        assert fmt == "json"
        assert data["roadmap"]["project_id"] == "test-project"
        assert data["phases"][0]["id"] == "01"


# --- save_roadmap: preserves YAML comments ---


class TestSaveRoadmap:
    def test_preserves_yaml_comments(self, tmp_path: Path):
        yaml_with_comments = textwrap.dedent("""\
            # Top-level comment preserved
            roadmap:
              project_id: test-project  # inline comment
            phases:
            - id: '01'
              name: Foundation
              steps: []
        """)
        roadmap_path = tmp_path / "roadmap.yaml"
        roadmap_path.write_text(yaml_with_comments)

        data, _ = load_roadmap(roadmap_path)
        data["phases"][0]["name"] = "Updated Foundation"
        save_roadmap(data, roadmap_path, fmt="yaml")

        saved_content = roadmap_path.read_text()
        assert "# Top-level comment preserved" in saved_content
        assert "Updated Foundation" in saved_content


# --- migrate_yaml_to_json: converts to deliver/roadmap.json ---


class TestMigrateYamlToJson:
    @pytest.mark.parametrize("deliver_exists", [False, True])
    def test_migrates_yaml_to_json_in_deliver(self, tmp_path: Path, deliver_exists: bool):
        if deliver_exists:
            (tmp_path / "deliver").mkdir()
        yaml_path = tmp_path / "roadmap.yaml"
        yaml_path.write_text(SAMPLE_YAML)

        json_path = migrate_yaml_to_json(tmp_path)

        assert json_path == tmp_path / "deliver" / "roadmap.json"
        assert json_path.exists()
        loaded = json.loads(json_path.read_text())
        assert loaded["roadmap"]["project_id"] == "test-project"

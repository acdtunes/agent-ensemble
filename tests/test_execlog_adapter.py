"""Tests for execlog_adapter module.

Behaviors:
1. load_execlog returns (data, format) tuple for both .yaml and .json files
2. detect_format finds execution log in deliver/execution-log.json or execution-log.yaml (priority order)
3. save_execlog writes to appropriate format (YAML or JSON)
4. migrate_execlog_to_json converts YAML log to JSON in deliver/ subdirectory

Test Budget: 4 behaviors x 2 = 8 unit tests maximum
"""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from en.adapters.execlog_adapter import (
    detect_format,
    load_execlog,
    migrate_execlog_to_json,
    save_execlog,
)


# --- Fixtures ---

SAMPLE_EXECLOG_DATA = {
    "schema_version": "2.0",
    "project_id": "test-project",
    "events": [
        {
            "sid": "01-01",
            "p": "RED_ACCEPTANCE",
            "s": "EXECUTED",
            "t": "2026-03-05T10:00:00Z",
        },
    ],
}

SAMPLE_YAML = textwrap.dedent("""\
    schema_version: "2.0"
    project_id: test-project
    events:
    - sid: 01-01
      p: RED_ACCEPTANCE
      s: EXECUTED
      t: '2026-03-05T10:00:00Z'
""")

SAMPLE_JSON = json.dumps(SAMPLE_EXECLOG_DATA, indent=2)


# --- detect_format: finds execution log in priority order ---


class TestDetectFormat:
    def test_finds_deliver_execlog_json_first(self, tmp_path: Path):
        deliver = tmp_path / "deliver"
        deliver.mkdir()
        (deliver / "execution-log.json").write_text(SAMPLE_JSON)
        (tmp_path / "execution-log.yaml").write_text(SAMPLE_YAML)

        path, fmt = detect_format(tmp_path)

        assert path == deliver / "execution-log.json"
        assert fmt == "json"

    def test_finds_execlog_yaml_when_no_json(self, tmp_path: Path):
        (tmp_path / "execution-log.yaml").write_text(SAMPLE_YAML)

        path, fmt = detect_format(tmp_path)

        assert path == tmp_path / "execution-log.yaml"
        assert fmt == "yaml"

    def test_returns_none_when_no_execlog(self, tmp_path: Path):
        result = detect_format(tmp_path)

        assert result is None


# --- load_execlog: returns (data, format) tuple ---


class TestLoadExeclog:
    def test_loads_yaml_file(self, tmp_path: Path):
        execlog_path = tmp_path / "execution-log.yaml"
        execlog_path.write_text(SAMPLE_YAML)

        data, fmt = load_execlog(execlog_path)

        assert fmt == "yaml"
        assert data["schema_version"] == "2.0"
        assert data["project_id"] == "test-project"
        assert len(data["events"]) == 1
        assert data["events"][0]["sid"] == "01-01"

    def test_loads_json_file(self, tmp_path: Path):
        execlog_path = tmp_path / "execution-log.json"
        execlog_path.write_text(SAMPLE_JSON)

        data, fmt = load_execlog(execlog_path)

        assert fmt == "json"
        assert data["schema_version"] == "2.0"
        assert data["project_id"] == "test-project"
        assert len(data["events"]) == 1


# --- save_execlog: writes to appropriate format ---


class TestSaveExeclog:
    def test_saves_json_format(self, tmp_path: Path):
        execlog_path = tmp_path / "execution-log.json"

        save_execlog(SAMPLE_EXECLOG_DATA, execlog_path, fmt="json")

        saved_content = execlog_path.read_text()
        loaded = json.loads(saved_content)
        assert loaded["project_id"] == "test-project"
        assert loaded["events"][0]["sid"] == "01-01"

    def test_saves_yaml_format(self, tmp_path: Path):
        execlog_path = tmp_path / "execution-log.yaml"

        save_execlog(SAMPLE_EXECLOG_DATA, execlog_path, fmt="yaml")

        data, fmt = load_execlog(execlog_path)
        assert fmt == "yaml"
        assert data["project_id"] == "test-project"
        assert data["events"][0]["sid"] == "01-01"


# --- migrate_execlog_to_json: converts to deliver/execution-log.json ---


class TestMigrateExeclogToJson:
    def test_creates_deliver_directory_and_json(self, tmp_path: Path):
        yaml_path = tmp_path / "execution-log.yaml"
        yaml_path.write_text(SAMPLE_YAML)

        json_path = migrate_execlog_to_json(tmp_path)

        assert json_path == tmp_path / "deliver" / "execution-log.json"
        assert json_path.exists()
        loaded = json.loads(json_path.read_text())
        assert loaded["project_id"] == "test-project"
        assert loaded["events"][0]["sid"] == "01-01"

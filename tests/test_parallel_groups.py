"""Tests for parallel_groups CLI module."""

import pytest

from agent_ensemble.cli.parallel_groups import (
    Step,
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

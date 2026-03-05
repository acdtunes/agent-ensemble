"""Roadmap adapter: format-agnostic I/O for roadmap files.

Provides pure functions for loading, saving, detecting, and migrating roadmaps
between YAML (v1.x) and JSON (v2.0.0) formats.

Supports both flat structure (roadmap.yaml, roadmap.json) and deliver/
subdirectory structure (deliver/roadmap.json) with v2.0.0 priority order.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from ruamel.yaml import YAML

RoadmapFormat = Literal["yaml", "json"]


def detect_format(feature_dir: Path) -> tuple[Path, RoadmapFormat] | None:
    """Detect roadmap file location and format in priority order.

    Priority:
    1. deliver/roadmap.json (v2.0.0 preferred)
    2. roadmap.json (flat v2.0.0)
    3. roadmap.yaml (v1.x legacy)

    Args:
        feature_dir: Directory to search for roadmap files.

    Returns:
        Tuple of (path, format) if found, None otherwise.
    """
    candidates = [
        (feature_dir / "deliver" / "roadmap.json", "json"),
        (feature_dir / "roadmap.json", "json"),
        (feature_dir / "roadmap.yaml", "yaml"),
    ]

    for path, fmt in candidates:
        if path.exists():
            return (path, fmt)

    return None


def load_roadmap(path: Path) -> tuple[dict, RoadmapFormat]:
    """Load roadmap from file, detecting format from extension.

    Args:
        path: Path to roadmap file (.yaml or .json).

    Returns:
        Tuple of (data, format).

    Raises:
        ValueError: If file extension is not recognized.
        FileNotFoundError: If file does not exist.
    """
    suffix = path.suffix.lower()

    if suffix in (".yaml", ".yml"):
        yaml = YAML()
        yaml.preserve_quotes = True
        data = yaml.load(path.read_text())
        return (data, "yaml")

    if suffix == ".json":
        data = json.loads(path.read_text())
        return (data, "json")

    raise ValueError(f"Unrecognized roadmap format: {suffix}")


def save_roadmap(data: dict, path: Path, *, fmt: RoadmapFormat) -> None:
    """Save roadmap to file in specified format.

    For YAML format, preserves comments if data was loaded with ruamel.yaml.
    For JSON format, uses 2-space indentation.

    Args:
        data: Roadmap data dictionary.
        path: Destination file path.
        fmt: Output format ('yaml' or 'json').
    """
    if fmt == "yaml":
        yaml = YAML()
        yaml.default_flow_style = False
        yaml.width = 120
        yaml.preserve_quotes = True
        with open(path, "w") as f:
            yaml.dump(data, f)
    else:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")


def migrate_yaml_to_json(feature_dir: Path) -> Path:
    """Migrate roadmap.yaml to deliver/roadmap.json.

    Creates deliver/ subdirectory if it doesn't exist.
    Loads YAML roadmap from feature_dir and writes JSON to deliver/roadmap.json.

    Args:
        feature_dir: Directory containing roadmap.yaml.

    Returns:
        Path to the created JSON file.

    Raises:
        FileNotFoundError: If roadmap.yaml doesn't exist.
    """
    yaml_path = feature_dir / "roadmap.yaml"
    data, _ = load_roadmap(yaml_path)

    deliver_dir = feature_dir / "deliver"
    deliver_dir.mkdir(exist_ok=True)

    json_path = deliver_dir / "roadmap.json"
    save_roadmap(data, json_path, fmt="json")

    return json_path

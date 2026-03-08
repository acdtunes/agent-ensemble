"""Shared I/O for YAML and JSON files.

Provides format-agnostic load/save used by both roadmap_adapter and execlog_adapter.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from ruamel.yaml import YAML

FileFormat = Literal["yaml", "json"]


def load_yaml_or_json(path: Path) -> tuple[dict, FileFormat]:
    """Load data from a YAML or JSON file, detecting format from extension.

    Args:
        path: Path to file (.yaml, .yml, or .json).

    Returns:
        Tuple of (data, format).

    Raises:
        ValueError: If file extension is not recognized.
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


def save_yaml_or_json(data: dict, path: Path, *, fmt: FileFormat) -> None:
    """Save data to a file in the specified format.

    For YAML: preserves comments if data was loaded with ruamel.yaml.
    For JSON: uses 2-space indentation with trailing newline.

    Args:
        data: Data dictionary.
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

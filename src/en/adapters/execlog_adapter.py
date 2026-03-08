"""Execution log adapter: format-agnostic I/O for execution log files.

Provides pure functions for loading, saving, detecting, and migrating execution logs
between YAML (v1.x) and JSON (v2.0.0) formats.

Supports both flat structure (execution-log.yaml) and deliver/
subdirectory structure (deliver/execution-log.json) with v2.0.0 priority order.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from en.adapters._io import load_yaml_or_json, save_yaml_or_json

ExeclogFormat = Literal["yaml", "json"]


def detect_format(feature_dir: Path) -> tuple[Path, ExeclogFormat] | None:
    """Detect execution log file location and format in priority order.

    Priority:
    1. deliver/execution-log.json (v2.0.0 preferred)
    2. execution-log.yaml (v1.x legacy)

    Args:
        feature_dir: Directory to search for execution log files.

    Returns:
        Tuple of (path, format) if found, None otherwise.
    """
    candidates = [
        (feature_dir / "deliver" / "execution-log.json", "json"),
        (feature_dir / "execution-log.yaml", "yaml"),
    ]

    for path, fmt in candidates:
        if path.exists():
            return (path, fmt)

    return None


def load_execlog(path: Path) -> tuple[dict, ExeclogFormat]:
    """Load execution log from file, detecting format from extension.

    Args:
        path: Path to execution log file (.yaml or .json).

    Returns:
        Tuple of (data, format).

    Raises:
        ValueError: If file extension is not recognized.
        FileNotFoundError: If file does not exist.
    """
    data, fmt = load_yaml_or_json(path)
    return (data, fmt)


def save_execlog(data: dict, path: Path, *, fmt: ExeclogFormat) -> None:
    """Save execution log to file in specified format.

    For YAML format, preserves comments if data was loaded with ruamel.yaml.
    For JSON format, uses 2-space indentation.

    Args:
        data: Execution log data dictionary.
        path: Destination file path.
        fmt: Output format ('yaml' or 'json').
    """
    save_yaml_or_json(data, path, fmt=fmt)


def migrate_execlog_to_json(feature_dir: Path) -> Path:
    """Migrate execution-log.yaml to deliver/execution-log.json.

    Creates deliver/ subdirectory if it doesn't exist.
    Loads YAML execution log from feature_dir and writes JSON to deliver/execution-log.json.

    Args:
        feature_dir: Directory containing execution-log.yaml.

    Returns:
        Path to the created JSON file.

    Raises:
        FileNotFoundError: If execution-log.yaml doesn't exist.
    """
    yaml_path = feature_dir / "execution-log.yaml"
    data, _ = load_execlog(yaml_path)

    deliver_dir = feature_dir / "deliver"
    deliver_dir.mkdir(exist_ok=True)

    json_path = deliver_dir / "execution-log.json"
    save_execlog(data, json_path, fmt="json")

    return json_path

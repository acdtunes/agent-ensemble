"""CLI: Normalize roadmap.yaml files to unified format.

Usage:
    python -m en.cli.migrate_roadmap <ROADMAP_PATH> [--dry-run] [--output-format json]
    python -m en.cli.migrate_roadmap --scan <ROOT_DIR> [--dry-run]

Detects Style A (feature_id / step_id / phase_id / blocked_by / acceptance_criteria)
and normalizes to Style B (roadmap wrapper / id / dependencies / criteria).
Optionally embeds step statuses from execution-log.yaml if present.

With --output-format json, writes to deliver/roadmap.json (v2.0.0 format).

Exit codes:
    0 = Success (all files migrated or already normalized)
    1 = Error (file not found, parse failure)
    2 = Usage error
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from ruamel.yaml import YAML


DEPRECATION_WARNING = (
    "DEPRECATION: roadmap.yaml format is deprecated. "
    "Use --output-format json to migrate to deliver/roadmap.json (nWave v2.0.0 format)."
)


# --- Types ---


@dataclass(frozen=True)
class StepStatus:
    status: str
    started_at: str | None = None
    completed_at: str | None = None


# --- Format detection ---


def detect_format(data: dict) -> Literal["style_a", "style_b"]:
    """Detect roadmap format by checking for Style A markers."""
    if "feature_id" in data:
        return "style_a"
    phases = data.get("phases", [])
    if phases and isinstance(phases[0], dict) and "phase_id" in phases[0]:
        return "style_a"
    return "style_b"


# --- Style A normalization ---


def _normalize_step(step: dict) -> dict:
    """Normalize a single step from Style A to Style B."""
    return {
        "id": step.get("step_id", step.get("id", "")),
        "name": step.get("name", ""),
        **({  "description": step["description"]} if "description" in step else {}),
        **({"files_to_modify": step["files_to_modify"]} if "files_to_modify" in step else {}),
        "dependencies": step.get("blocked_by", step.get("dependencies", [])),
        "criteria": step.get("acceptance_criteria", step.get("criteria", [])),
    }


def _normalize_phase(phase: dict) -> dict:
    """Normalize a single phase from Style A to Style B."""
    return {
        "id": phase.get("phase_id", phase.get("id", "")),
        "name": phase.get("name", ""),
        **({"description": phase["description"]} if "description" in phase else {}),
        "steps": [_normalize_step(s) for s in phase.get("steps", [])],
    }


def normalize_style_a(data: dict) -> dict:
    """Restructure Style A roadmap to Style B format."""
    phases = [_normalize_phase(p) for p in data.get("phases", [])]
    return {
        "roadmap": {
            "project_id": data.get("feature_id", ""),
        },
        "phases": phases,
    }


# --- Execution log status derivation ---


def _fold_event(acc: dict[str, StepStatus], event: dict) -> dict[str, StepStatus]:
    """Fold a single event into the step-status accumulator (immutable)."""
    sid = event.get("sid", "")
    if not sid:
        return acc

    prev = acc.get(sid, StepStatus(status="in_progress", started_at=event.get("t")))

    if event.get("s") == "FAILED":
        new_status = StepStatus(status="failed", started_at=prev.started_at)
    elif event.get("p") == "COMMIT" and event.get("s") == "EXECUTED":
        new_status = StepStatus(
            status="approved",
            started_at=prev.started_at,
            completed_at=event.get("t"),
        )
    else:
        new_status = prev

    return {**acc, sid: new_status}


def derive_step_statuses(events: list[dict]) -> dict[str, StepStatus]:
    """Derive step statuses from execution-log events.

    Rules:
    - COMMIT + EXECUTED -> approved
    - Any FAILED event -> failed
    - Any other event -> in_progress
    - started_at = first event timestamp per step
    - completed_at = COMMIT event timestamp
    """
    from functools import reduce
    return reduce(_fold_event, events, {})


# --- Status embedding ---


def embed_statuses(data: dict, statuses: dict[str, StepStatus]) -> dict:
    """Merge step statuses into roadmap phases (returns new dict)."""
    if not statuses:
        return data

    def _enrich_step(step: dict) -> dict:
        step_id = step.get("id", "")
        if step_id not in statuses:
            return step
        info = statuses[step_id]
        enriched = dict(step)
        enriched["status"] = info.status
        if info.started_at:
            enriched["started_at"] = info.started_at
        if info.completed_at:
            enriched["completed_at"] = info.completed_at
        return enriched

    def _enrich_phase(phase: dict) -> dict:
        return {**phase, "steps": [_enrich_step(s) for s in phase.get("steps", [])]}

    return {**data, "phases": [_enrich_phase(p) for p in data.get("phases", [])]}


# --- IO helpers ---

SKIP_DIRS = {"node_modules", ".stryker-tmp", "__pycache__", ".git"}


def _load_yaml(path: Path) -> dict:
    yaml = YAML()
    yaml.preserve_quotes = True
    return yaml.load(path.read_text())


def _write_yaml(data: dict, path: Path) -> None:
    yaml = YAML()
    yaml.default_flow_style = False
    yaml.width = 120
    with open(path, "w") as f:
        yaml.dump(data, f)


def _write_json(data: dict, path: Path) -> None:
    """Write roadmap data as JSON to deliver/ subdirectory."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def _find_roadmaps(root: Path) -> list[Path]:
    """Recursively find roadmap.yaml files, skipping known directories."""
    results = []
    for child in sorted(root.iterdir()):
        if child.is_dir():
            if child.name not in SKIP_DIRS:
                results.extend(_find_roadmaps(child))
        elif child.name == "roadmap.yaml":
            results.append(child)
    return results


# --- Migration pipeline ---

OutputFormat = Literal["yaml", "json"]


def migrate_one(
    roadmap_path: Path,
    *,
    dry_run: bool,
    output_format: OutputFormat = "yaml",
    emit_deprecation: bool = True,
) -> str:
    """Migrate a single roadmap.yaml. Returns a status message.

    Args:
        roadmap_path: Path to roadmap.yaml file.
        dry_run: If True, show changes without writing.
        output_format: Output format - 'yaml' (in-place) or 'json' (deliver/roadmap.json).
        emit_deprecation: If True, emit deprecation warning for YAML files.
    """
    # Emit deprecation warning for YAML format
    if emit_deprecation and roadmap_path.suffix.lower() in (".yaml", ".yml"):
        print(DEPRECATION_WARNING, file=sys.stderr)

    data = _load_yaml(roadmap_path)
    if data is None:
        return f"SKIP (empty): {roadmap_path}"

    fmt = detect_format(data)
    needs_migration = fmt == "style_a"

    # Normalize if Style A
    normalized = normalize_style_a(data) if needs_migration else dict(data)

    # Check for execution-log.yaml in same directory
    log_path = roadmap_path.parent / "execution-log.yaml"
    statuses: dict[str, StepStatus] = {}
    if log_path.exists():
        log_data = _load_yaml(log_path)
        if log_data and log_data.get("events"):
            statuses = derive_step_statuses(log_data["events"])

    # Check if status embedding adds anything new
    has_new_statuses = False
    if statuses:
        for phase in normalized.get("phases", []):
            for step in phase.get("steps", []):
                sid = step.get("id", "")
                if sid in statuses and "status" not in step:
                    has_new_statuses = True
                    break

    # For JSON output, always proceed (creating deliver/roadmap.json)
    if output_format == "yaml" and not needs_migration and not has_new_statuses:
        return f"SKIP (already normalized): {roadmap_path}"

    # Embed statuses only for steps that don't already have them
    if has_new_statuses:
        normalized = embed_statuses(normalized, statuses)

    if dry_run:
        changes = []
        if needs_migration:
            changes.append("normalize Style A -> B")
        if has_new_statuses:
            changes.append(f"embed {len(statuses)} step statuses from execution-log")
        if output_format == "json":
            changes.append("output to deliver/roadmap.json")
        return f"WOULD MIGRATE ({', '.join(changes)}): {roadmap_path}"

    # Write output
    if output_format == "json":
        json_path = roadmap_path.parent / "deliver" / "roadmap.json"
        _write_json(normalized, json_path)
        changes = ["migrated to deliver/roadmap.json"]
    else:
        _write_yaml(normalized, roadmap_path)
        changes = []

    if needs_migration:
        changes.append("normalized Style A -> B")
    if has_new_statuses:
        changes.append(f"embedded {len(statuses)} step statuses")

    return f"MIGRATED ({', '.join(changes)}): {roadmap_path}"


# --- CLI entry point ---


def _parse_output_format(args: list[str]) -> tuple[OutputFormat, list[str]]:
    """Parse --output-format flag from args. Returns (format, remaining_args)."""
    if "--output-format" not in args:
        return ("yaml", args)

    idx = args.index("--output-format")
    if idx + 1 >= len(args):
        return ("yaml", args)

    fmt_value = args[idx + 1]
    remaining = args[:idx] + args[idx + 2 :]

    if fmt_value == "json":
        return ("json", remaining)
    return ("yaml", remaining)


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    dry_run = "--dry-run" in argv
    args = [a for a in argv if a != "--dry-run"]

    # Parse output format
    output_format, args = _parse_output_format(args)

    # --scan mode
    if "--scan" in args:
        scan_idx = args.index("--scan")
        if scan_idx + 1 >= len(args):
            print("Error: --scan requires a directory path", file=sys.stderr)
            return 2
        root = Path(args[scan_idx + 1])
        if not root.is_dir():
            print(f"Error: not a directory: {root}", file=sys.stderr)
            return 1
        roadmaps = _find_roadmaps(root)
        if not roadmaps:
            print(f"No roadmap.yaml files found under {root}")
            return 0
        for path in roadmaps:
            print(migrate_one(path, dry_run=dry_run, output_format=output_format))
        return 0

    # Single file mode
    if not args:
        print(
            "Usage: python -m en.cli.migrate_roadmap <ROADMAP_PATH> "
            "[--dry-run] [--output-format json]"
        )
        print(
            "       python -m en.cli.migrate_roadmap --scan <ROOT_DIR> [--dry-run]"
        )
        return 2

    roadmap_path = Path(args[0])
    if not roadmap_path.exists():
        print(f"Error: file not found: {roadmap_path}", file=sys.stderr)
        return 1

    print(migrate_one(roadmap_path, dry_run=dry_run, output_format=output_format))
    return 0


if __name__ == "__main__":
    sys.exit(main())

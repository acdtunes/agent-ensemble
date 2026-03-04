"""CLI: Normalize roadmap.yaml files to unified format.

Usage:
    python -m nw_teams.cli.migrate_roadmap <ROADMAP_PATH> [--dry-run]
    python -m nw_teams.cli.migrate_roadmap --scan <ROOT_DIR> [--dry-run]

Detects Style A (feature_id / step_id / phase_id / blocked_by / acceptance_criteria)
and normalizes to Style B (roadmap wrapper / id / dependencies / criteria).
Optionally embeds step statuses from execution-log.yaml if present.

Exit codes:
    0 = Success (all files migrated or already normalized)
    1 = Error (file not found, parse failure)
    2 = Usage error
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from ruamel.yaml import YAML


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
    normalized = {}
    normalized["id"] = step.get("step_id", step.get("id", ""))
    normalized["name"] = step.get("name", "")
    if "description" in step:
        normalized["description"] = step["description"]
    if "files_to_modify" in step:
        normalized["files_to_modify"] = step["files_to_modify"]
    normalized["dependencies"] = step.get("blocked_by", step.get("dependencies", []))
    normalized["criteria"] = step.get("acceptance_criteria", step.get("criteria", []))
    return normalized


def _normalize_phase(phase: dict) -> dict:
    """Normalize a single phase from Style A to Style B."""
    normalized = {
        "id": phase.get("phase_id", phase.get("id", "")),
        "name": phase.get("name", ""),
    }
    if "description" in phase:
        normalized["description"] = phase["description"]
    normalized["steps"] = [_normalize_step(s) for s in phase.get("steps", [])]
    return normalized


def normalize_style_a(data: dict) -> dict:
    """Restructure Style A roadmap to Style B format."""
    phases = [_normalize_phase(p) for p in data.get("phases", [])]
    total_steps = sum(len(p["steps"]) for p in phases)
    return {
        "roadmap": {
            "project_id": data.get("feature_id", ""),
        },
        "phases": phases,
    }


# --- Execution log status derivation ---

def derive_step_statuses(events: list[dict]) -> dict[str, StepStatus]:
    """Derive step statuses from execution-log events.

    Rules:
    - COMMIT + EXECUTED → approved
    - Any FAILED event → failed
    - Any other event → in_progress
    - started_at = first event timestamp per step
    - completed_at = COMMIT event timestamp
    """
    steps: dict[str, dict] = {}

    for event in events:
        sid = event.get("sid", "")
        if not sid:
            continue

        if sid not in steps:
            steps[sid] = {
                "status": "in_progress",
                "started_at": event.get("t"),
                "completed_at": None,
            }

        entry = steps[sid]

        if event.get("s") == "FAILED":
            entry["status"] = "failed"
        elif event.get("p") == "COMMIT" and event.get("s") == "EXECUTED":
            entry["status"] = "approved"
            entry["completed_at"] = event.get("t")

    return {
        sid: StepStatus(
            status=info["status"],
            started_at=info["started_at"],
            completed_at=info["completed_at"],
        )
        for sid, info in steps.items()
    }


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

def migrate_one(roadmap_path: Path, *, dry_run: bool) -> str:
    """Migrate a single roadmap.yaml. Returns a status message."""
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

    if not needs_migration and not has_new_statuses:
        return f"SKIP (already normalized): {roadmap_path}"

    # Embed statuses only for steps that don't already have them
    if has_new_statuses:
        normalized = embed_statuses(normalized, statuses)

    if dry_run:
        changes = []
        if needs_migration:
            changes.append("normalize Style A → B")
        if has_new_statuses:
            changes.append(f"embed {len(statuses)} step statuses from execution-log")
        return f"WOULD MIGRATE ({', '.join(changes)}): {roadmap_path}"

    _write_yaml(normalized, roadmap_path)

    changes = []
    if needs_migration:
        changes.append("normalized Style A → B")
    if has_new_statuses:
        changes.append(f"embedded {len(statuses)} step statuses")
    return f"MIGRATED ({', '.join(changes)}): {roadmap_path}"


# --- CLI entry point ---

def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    dry_run = "--dry-run" in argv
    args = [a for a in argv if a != "--dry-run"]

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
            print(migrate_one(path, dry_run=dry_run))
        return 0

    # Single file mode
    if not args:
        print("Usage: python -m nw_teams.cli.migrate_roadmap <ROADMAP_PATH> [--dry-run]")
        print("       python -m nw_teams.cli.migrate_roadmap --scan <ROOT_DIR> [--dry-run]")
        return 2

    roadmap_path = Path(args[0])
    if not roadmap_path.exists():
        print(f"Error: file not found: {roadmap_path}", file=sys.stderr)
        return 1

    print(migrate_one(roadmap_path, dry_run=dry_run))
    return 0


if __name__ == "__main__":
    sys.exit(main())

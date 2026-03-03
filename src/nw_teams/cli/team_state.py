"""CLI: Track team state via roadmap.yaml (unified format).

Usage:
    python -m nw_teams.cli.team_state update ROADMAP_PATH --step STEP_ID --status STATUS [--teammate TEAMMATE_ID]
    python -m nw_teams.cli.team_state show ROADMAP_PATH
    python -m nw_teams.cli.team_state check ROADMAP_PATH --phase PHASE_ID

Exit codes:
    0 = Success / All complete
    1 = In progress / Not complete / Step not found
    2 = Usage error
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from ruamel.yaml import YAML


# --- Constants ---

VALID_STATUSES = {"pending", "claimed", "in_progress", "review", "approved", "failed"}
TERMINAL_STATUSES = {"approved", "failed"}
ACTIVE_STATUSES = {"claimed", "in_progress", "review"}
STATUS_ICONS = {
    "pending": "○",
    "claimed": "◐",
    "in_progress": "◑",
    "review": "◕",
    "approved": "●",
    "failed": "✗",
}


# --- Roadmap data helpers ---

def _load_roadmap(path: Path):
    """Load roadmap.yaml with ruamel.yaml for round-trip preservation."""
    yaml = YAML()
    yaml.preserve_quotes = True
    return yaml, yaml.load(path.read_text())


def _save_roadmap(yaml_instance, data: dict, path: Path) -> None:
    """Write roadmap.yaml preserving comments and formatting."""
    with open(path, "w") as f:
        yaml_instance.dump(data, f)


def _all_steps(data: dict) -> list[dict]:
    """Flatten all steps from all phases."""
    return [
        step
        for phase in data.get("phases", [])
        for step in phase.get("steps", [])
    ]


def _find_step(data: dict, step_id: str):
    """Find a step by ID across all phases. Returns the step dict or None."""
    return next((s for s in _all_steps(data) if s.get("id") == step_id), None)


def _find_phase(data: dict, phase_id: str):
    """Find a phase by ID. Returns the phase dict or None."""
    for phase in data.get("phases", []):
        if str(phase.get("id")) == str(phase_id):
            return phase
    return None


def _compute_summary(data: dict) -> dict:
    """Compute summary counts from step statuses across all phases."""
    steps = _all_steps(data)
    statuses = [s.get("status", "pending") for s in steps]
    completed = statuses.count("approved")
    failed = statuses.count("failed")
    in_progress = sum(1 for s in statuses if s in ACTIVE_STATUSES)
    return {
        "total_steps": len(steps),
        "total_phases": len(data.get("phases", [])),
        "completed": completed,
        "failed": failed,
        "in_progress": in_progress,
        "pending": len(steps) - completed - failed - in_progress,
    }


def _compute_phase_status(steps: list[dict]) -> str:
    """Compute display status for a phase from its steps."""
    completed = sum(1 for s in steps if s.get("status", "pending") == "approved")
    has_active = any(s.get("status", "pending") in ACTIVE_STATUSES for s in steps)
    if completed == len(steps):
        return "COMPLETE"
    return "IN PROGRESS" if has_active else "PENDING"


# --- CLI infrastructure ---

def _parse_args(args: list[str], named_flags: list[str]) -> tuple[dict[str, str | None], str | None, str | None]:
    """Parse CLI args with named --flags and a positional roadmap path.

    Returns (parsed_flags, roadmap_path, error_arg).
    error_arg is set if an unknown argument is encountered.
    """
    parsed: dict[str, str | None] = {flag: None for flag in named_flags}
    roadmap_path = None

    i = 0
    while i < len(args):
        matched = False
        for flag in named_flags:
            if args[i] == f"--{flag}" and i + 1 < len(args):
                parsed[flag] = args[i + 1]
                i += 2
                matched = True
                break
        if matched:
            continue
        if not roadmap_path:
            roadmap_path = args[i]
            i += 1
        else:
            return parsed, roadmap_path, args[i]

    return parsed, roadmap_path, None


def _validate_roadmap_file(roadmap_path: str | None) -> Path | None:
    """Validate roadmap path exists. Returns Path if valid, None if not (prints error)."""
    if not roadmap_path:
        return None
    roadmap_file = Path(roadmap_path)
    if not roadmap_file.exists():
        print(f"Error: roadmap not found: {roadmap_file}", file=sys.stderr)
        return None
    return roadmap_file


# --- Command handlers ---

def cmd_update(args: list[str]) -> int:
    """Update step status in roadmap.yaml."""
    parsed, roadmap_path, error_arg = _parse_args(args, ["step", "status", "teammate"])
    if error_arg:
        print(f"Unknown argument: {error_arg}", file=sys.stderr)
        return 2

    step_id = parsed["step"]
    status = parsed["status"]
    teammate_id = parsed["teammate"]

    if not roadmap_path or not step_id or not status:
        print("Error: ROADMAP_PATH, --step, and --status required", file=sys.stderr)
        return 2

    if status not in VALID_STATUSES:
        print(f"Error: invalid status '{status}'. Valid: {sorted(VALID_STATUSES)}", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(roadmap_path)
    if not roadmap_file:
        return 2

    yaml, data = _load_roadmap(roadmap_file)

    step = _find_step(data, step_id)
    if step is None:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 1

    now = datetime.now(timezone.utc).isoformat()

    step["status"] = status

    if teammate_id:
        step["teammate_id"] = teammate_id

    if status == "claimed" and not step.get("started_at"):
        step["started_at"] = now

    if status in TERMINAL_STATUSES and not step.get("completed_at"):
        step["completed_at"] = now

    if status == "review":
        step["review_attempts"] = step.get("review_attempts", 0) + 1

    _save_roadmap(yaml, data, roadmap_file)

    print(f"Updated {step_id}: -> {status}")
    return 0


def cmd_show(args: list[str]) -> int:
    """Show roadmap progress summary."""
    if not args:
        print("Error: ROADMAP_PATH required", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(args[0])
    if not roadmap_file:
        return 2

    yaml, data = _load_roadmap(roadmap_file)
    summary = _compute_summary(data)

    print("=== Roadmap Progress ===")
    print(f"Progress: {summary['completed']}/{summary['total_steps']} completed")
    print(f"  In progress: {summary['in_progress']}")
    print(f"  Failed: {summary['failed']}")
    print(f"  Pending: {summary['pending']}")
    print()

    for phase in data.get("phases", []):
        phase_id = phase.get("id", "?")
        phase_name = phase.get("name", "")
        steps = phase.get("steps", [])
        completed = sum(1 for s in steps if s.get("status", "pending") == "approved")
        total = len(steps)
        phase_status = _compute_phase_status(steps)

        print(f"Phase {phase_id}: {phase_name} [{phase_status}] ({completed}/{total}):")
        for step in steps:
            step_id = step.get("id", "?")
            step_name = step.get("name", "")
            step_status = step.get("status", "pending")
            icon = STATUS_ICONS.get(step_status, "?")
            teammate = f" [{step['teammate_id']}]" if step.get("teammate_id") else ""
            print(f"  {icon} {step_id}: {step_name}{teammate}")
        print()

    return 0


def cmd_check(args: list[str]) -> int:
    """Check if a phase is complete."""
    parsed, roadmap_path, error_arg = _parse_args(args, ["phase"])
    if error_arg:
        print(f"Unknown argument: {error_arg}", file=sys.stderr)
        return 2

    phase_id = parsed["phase"]

    if not roadmap_path or phase_id is None:
        print("Error: ROADMAP_PATH and --phase required", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(roadmap_path)
    if not roadmap_file:
        return 2

    yaml, data = _load_roadmap(roadmap_file)

    phase = _find_phase(data, phase_id)
    if phase is None:
        print(f"Error: phase {phase_id} not found", file=sys.stderr)
        return 2

    steps = phase.get("steps", [])
    completed = sum(1 for s in steps if s.get("status", "pending") == "approved")
    failed = sum(1 for s in steps if s.get("status", "pending") == "failed")
    total = len(steps)

    print(f"Phase {phase_id}: {completed}/{total} approved, {failed} failed")

    if failed > 0:
        print("FAILED steps:")
        for step in steps:
            if step.get("status", "pending") == "failed":
                print(f"  - {step.get('id', '?')}: {step.get('name', '')}")
        return 1

    if completed == total:
        print("Phase COMPLETE")
        return 0
    else:
        print("Phase IN PROGRESS")
        return 1


# --- Entry point ---

def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m nw_teams.cli.team_state {update|show|check} [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    commands = {
        "update": cmd_update,
        "show": cmd_show,
        "check": cmd_check,
    }

    if subcommand not in commands:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2

    return commands[subcommand](sub_args)


if __name__ == "__main__":
    sys.exit(main())

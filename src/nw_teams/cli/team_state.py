"""CLI: Track team state during parallel execution.

Usage:
    python -m nw_teams.cli.team_state init --plan PLAN_PATH --output STATE_PATH
    python -m nw_teams.cli.team_state update STATE_PATH --step STEP_ID --status STATUS [--teammate TEAMMATE_ID] [--worktree]
    python -m nw_teams.cli.team_state show STATE_PATH
    python -m nw_teams.cli.team_state check STATE_PATH --layer LAYER_NUM
    python -m nw_teams.cli.team_state should-worktree STATE_PATH --step STEP_ID

Exit codes:
    0 = Success / All complete / No worktree needed
    1 = In progress / Not complete / Worktree required / Blocked
    2 = Usage error
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import NamedTuple

import yaml


class StepState(NamedTuple):
    step_id: str
    name: str
    layer: int
    status: str  # pending | claimed | in_progress | review | approved | failed
    teammate_id: str | None
    started_at: str | None
    completed_at: str | None
    review_attempts: int


VALID_STATUSES = {"pending", "claimed", "in_progress", "review", "approved", "failed"}
TERMINAL_STATUSES = {"approved", "failed"}
ACTIVE_STATUSES = {"claimed", "in_progress", "review"}

WORKTREE_DIR = ".claude/worktrees"


def find_file_conflicts(
    state: dict, target_step_id: str
) -> list[tuple[str, list[str]]]:
    """Find active steps whose files_to_modify overlap with the target step.

    Returns list of (conflicting_step_id, overlapping_files).
    """
    target = state["steps"].get(target_step_id)
    if not target:
        return []

    target_files = set(target.get("files_to_modify", []))
    if not target_files:
        return []

    conflicts = []
    for sid, step in state["steps"].items():
        if sid == target_step_id:
            continue
        if step["status"] not in ACTIVE_STATUSES:
            continue
        step_files = set(step.get("files_to_modify", []))
        overlap = target_files & step_files
        if overlap:
            conflicts.append((sid, sorted(overlap)))

    return conflicts


def cmd_init(args: list[str]) -> int:
    """Initialize team state from execution plan."""
    plan_path = None
    output_path = None

    i = 0
    while i < len(args):
        if args[i] == "--plan" and i + 1 < len(args):
            plan_path = args[i + 1]
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not plan_path or not output_path:
        print("Error: --plan and --output required", file=sys.stderr)
        return 2

    plan_file = Path(plan_path)
    if not plan_file.exists():
        print(f"Error: plan not found: {plan_file}", file=sys.stderr)
        return 2

    plan = yaml.safe_load(plan_file.read_text())

    state = {
        "schema_version": "1.0",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "plan_path": str(plan_path),
        "current_layer": 1,
        "summary": {
            "total_steps": plan["summary"]["total_steps"],
            "total_layers": plan["summary"]["total_layers"],
            "completed": 0,
            "failed": 0,
            "in_progress": 0,
        },
        "steps": {},
        "teammates": {},
    }

    # Initialize step states from plan
    for layer in plan["layers"]:
        layer_num = layer["layer"]
        for step in layer["steps"]:
            step_id = step["step_id"]
            state["steps"][step_id] = {
                "step_id": step_id,
                "name": step["name"],
                "layer": layer_num,
                "status": "pending",
                "teammate_id": None,
                "started_at": None,
                "completed_at": None,
                "review_attempts": 0,
                "files_to_modify": step.get("files_to_modify", []),
            }

    Path(output_path).write_text(
        yaml.dump(state, default_flow_style=False, sort_keys=False)
    )
    print(f"Team state initialized: {output_path}")
    print(f"  Layers: {state['summary']['total_layers']}")
    print(f"  Steps: {state['summary']['total_steps']}")

    return 0


def cmd_update(args: list[str]) -> int:
    """Update step status in team state."""
    state_path = None
    step_id = None
    status = None
    teammate_id = None
    worktree_flag = False

    i = 0
    while i < len(args):
        if args[i] == "--step" and i + 1 < len(args):
            step_id = args[i + 1]
            i += 2
        elif args[i] == "--status" and i + 1 < len(args):
            status = args[i + 1]
            i += 2
        elif args[i] == "--teammate" and i + 1 < len(args):
            teammate_id = args[i + 1]
            i += 2
        elif args[i] == "--worktree":
            worktree_flag = True
            i += 1
        elif not state_path:
            state_path = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not state_path or not step_id or not status:
        print("Error: STATE_PATH, --step, and --status required", file=sys.stderr)
        return 2

    if status not in VALID_STATUSES:
        print(f"Error: invalid status '{status}'. Valid: {VALID_STATUSES}", file=sys.stderr)
        return 2

    state_file = Path(state_path)
    if not state_file.exists():
        print(f"Error: state not found: {state_file}", file=sys.stderr)
        return 2

    state = yaml.safe_load(state_file.read_text())

    if step_id not in state["steps"]:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 1

    step = state["steps"][step_id]
    old_status = step["status"]
    now = datetime.utcnow().isoformat() + "Z"

    # Conflict gate: block in_progress transition when files overlap with active steps
    if status == "in_progress":
        conflicts = find_file_conflicts(state, step_id)
        if conflicts and not worktree_flag:
            print(f"BLOCKED: Step {step_id} has file conflicts with in-progress steps.")
            for csid, files in conflicts:
                print(f"Conflicting with {csid}: {', '.join(files)}")
            print()
            print("Either:")
            print(f"  1. Create a worktree first: python -m nw_teams.cli.worktree create {step_id}")
            print(f"     Then retry with: --worktree flag")
            print(f"  2. Wait for conflicting steps to complete")
            return 1

        if worktree_flag:
            # Validate worktree exists
            wt_path = Path(WORKTREE_DIR) / f"crafter-{step_id}"
            if not wt_path.exists():
                print(
                    f"Error: --worktree passed but worktree not found at {wt_path}",
                    file=sys.stderr,
                )
                print(f"Create it first: python -m nw_teams.cli.worktree create {step_id}")
                return 2
            step["worktree"] = True

    # Update step
    step["status"] = status
    step["teammate_id"] = teammate_id or step["teammate_id"]

    if status == "claimed" and not step["started_at"]:
        step["started_at"] = now

    if status in TERMINAL_STATUSES and not step["completed_at"]:
        step["completed_at"] = now

    if status == "review":
        step["review_attempts"] += 1

    # Update summary counts
    summary = state["summary"]

    # Decrement old status count
    if old_status == "approved":
        summary["completed"] -= 1
    elif old_status == "failed":
        summary["failed"] -= 1
    elif old_status in {"claimed", "in_progress", "review"}:
        summary["in_progress"] -= 1

    # Increment new status count
    if status == "approved":
        summary["completed"] += 1
    elif status == "failed":
        summary["failed"] += 1
    elif status in {"claimed", "in_progress", "review"}:
        summary["in_progress"] += 1

    # Update timestamp
    state["updated_at"] = now

    # Track teammate
    if teammate_id:
        if teammate_id not in state["teammates"]:
            state["teammates"][teammate_id] = {
                "teammate_id": teammate_id,
                "current_step": None,
                "completed_steps": [],
            }

        teammate = state["teammates"][teammate_id]
        if status in {"claimed", "in_progress", "review"}:
            teammate["current_step"] = step_id
        elif status in TERMINAL_STATUSES:
            teammate["current_step"] = None
            if step_id not in teammate["completed_steps"]:
                teammate["completed_steps"].append(step_id)

    state_file.write_text(
        yaml.dump(state, default_flow_style=False, sort_keys=False)
    )

    print(f"Updated {step_id}: {old_status} -> {status}")

    return 0


def cmd_show(args: list[str]) -> int:
    """Show current team state."""
    if not args:
        print("Error: STATE_PATH required", file=sys.stderr)
        return 2

    state_path = args[0]
    state_file = Path(state_path)
    if not state_file.exists():
        print(f"Error: state not found: {state_file}", file=sys.stderr)
        return 2

    state = yaml.safe_load(state_file.read_text())
    summary = state["summary"]

    print("=== Team State ===")
    print(f"Updated: {state['updated_at']}")
    print(f"Current layer: {state['current_layer']}")
    print()
    print(f"Progress: {summary['completed']}/{summary['total_steps']} completed")
    print(f"  In progress: {summary['in_progress']}")
    print(f"  Failed: {summary['failed']}")
    print()

    # Group steps by layer
    layers: dict[int, list] = {}
    for step in state["steps"].values():
        layer = step["layer"]
        if layer not in layers:
            layers[layer] = []
        layers[layer].append(step)

    for layer_num in sorted(layers.keys()):
        layer_steps = layers[layer_num]
        completed = sum(1 for s in layer_steps if s["status"] == "approved")
        total = len(layer_steps)
        status = "COMPLETE" if completed == total else "IN PROGRESS" if any(s["status"] not in {"pending", "approved", "failed"} for s in layer_steps) else "PENDING"

        print(f"Layer {layer_num} [{status}] ({completed}/{total}):")
        for step in sorted(layer_steps, key=lambda s: s["step_id"]):
            status_icon = {
                "pending": "○",
                "claimed": "◐",
                "in_progress": "◑",
                "review": "◕",
                "approved": "●",
                "failed": "✗",
            }.get(step["status"], "?")
            teammate = f" [{step['teammate_id']}]" if step["teammate_id"] else ""
            print(f"  {status_icon} {step['step_id']}: {step['name']}{teammate}")
        print()

    if state["teammates"]:
        print("=== Teammates ===")
        for tid, teammate in state["teammates"].items():
            current = teammate["current_step"] or "idle"
            completed = len(teammate["completed_steps"])
            print(f"  {tid}: {current} ({completed} completed)")

    return 0


def cmd_check(args: list[str]) -> int:
    """Check if a layer is complete."""
    state_path = None
    layer_num = None

    i = 0
    while i < len(args):
        if args[i] == "--layer" and i + 1 < len(args):
            layer_num = int(args[i + 1])
            i += 2
        elif not state_path:
            state_path = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not state_path or layer_num is None:
        print("Error: STATE_PATH and --layer required", file=sys.stderr)
        return 2

    state_file = Path(state_path)
    if not state_file.exists():
        print(f"Error: state not found: {state_file}", file=sys.stderr)
        return 2

    state = yaml.safe_load(state_file.read_text())

    layer_steps = [s for s in state["steps"].values() if s["layer"] == layer_num]
    if not layer_steps:
        print(f"Error: layer {layer_num} not found", file=sys.stderr)
        return 2

    completed = sum(1 for s in layer_steps if s["status"] == "approved")
    failed = sum(1 for s in layer_steps if s["status"] == "failed")
    total = len(layer_steps)

    print(f"Layer {layer_num}: {completed}/{total} approved, {failed} failed")

    if failed > 0:
        print("FAILED steps:")
        for step in layer_steps:
            if step["status"] == "failed":
                print(f"  - {step['step_id']}: {step['name']}")
        return 1

    if completed == total:
        print("Layer COMPLETE")
        return 0
    else:
        print("Layer IN PROGRESS")
        return 1


def cmd_should_worktree(args: list[str]) -> int:
    """Check if a step needs a worktree given currently active steps."""
    state_path = None
    step_id = None

    i = 0
    while i < len(args):
        if args[i] == "--step" and i + 1 < len(args):
            step_id = args[i + 1]
            i += 2
        elif not state_path:
            state_path = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not state_path or not step_id:
        print("Error: STATE_PATH and --step required", file=sys.stderr)
        return 2

    state_file = Path(state_path)
    if not state_file.exists():
        print(f"Error: state not found: {state_file}", file=sys.stderr)
        return 2

    state = yaml.safe_load(state_file.read_text())

    if step_id not in state["steps"]:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 2

    conflicts = find_file_conflicts(state, step_id)

    if conflicts:
        print("WORKTREE_REQUIRED")
        for csid, files in conflicts:
            print(f"  Conflicts with {csid}: {', '.join(files)}")
        return 1
    else:
        print("NO_WORKTREE_NEEDED")
        return 0


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m nw_teams.cli.team_state {init|update|show|check|should-worktree} [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    commands = {
        "init": cmd_init,
        "update": cmd_update,
        "show": cmd_show,
        "check": cmd_check,
        "should-worktree": cmd_should_worktree,
    }

    if subcommand not in commands:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2

    return commands[subcommand](sub_args)


if __name__ == "__main__":
    sys.exit(main())

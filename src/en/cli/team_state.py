"""CLI: Track team state via roadmap files (JSON or YAML format).

Usage:
    python -m en.cli.team_state start-step ROADMAP_PATH --step STEP_ID --teammate TEAMMATE_ID
    python -m en.cli.team_state transition ROADMAP_PATH --step STEP_ID --status STATUS
    python -m en.cli.team_state complete-step ROADMAP_PATH --step STEP_ID
    python -m en.cli.team_state update ROADMAP_PATH --step STEP_ID --status STATUS [--teammate TEAMMATE_ID]
    python -m en.cli.team_state show ROADMAP_PATH
    python -m en.cli.team_state check ROADMAP_PATH --phase PHASE_ID
    python -m en.cli.team_state recover ROADMAP_PATH

Exit codes:
    0 = Success / All complete
    1 = In progress / Not complete / Step not found / Merge conflict
    2 = Usage error
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from en.adapters.roadmap_adapter import (
    RoadmapFormat,
    load_roadmap,
    save_roadmap,
)
from en.git import (
    BRANCH_PREFIX,
    WORKTREE_DIR,
    branch_name as _branch_name,
    get_default_branch as _get_default_branch,
    get_repo_root as _get_repo_root,
    run_git as _run_git,
    worktree_path as _worktree_path,
)


# --- Constants ---

VALID_STATUSES = {"pending", "claimed", "in_progress", "review", "approved", "failed"}
TERMINAL_STATUSES = {"approved", "failed"}
ACTIVE_STATUSES = {"claimed", "in_progress", "review"}
VALID_TRANSITIONS: frozenset[tuple[str, str]] = frozenset({
    ("in_progress", "review"),
    ("review", "in_progress"),
    ("in_progress", "failed"),
    ("review", "failed"),
})
STATUS_ICONS = {
    "pending": "○",
    "claimed": "◐",
    "in_progress": "◑",
    "review": "◕",
    "approved": "●",
    "failed": "✗",
}


def _worktree_exists(step_id: str) -> bool:
    """Check if a worktree exists for a step."""
    return _worktree_path(step_id).exists()


def _create_worktree(step_id: str) -> tuple[bool, str]:
    """Create a worktree for a step. Returns (success, path_or_error)."""
    wt_path = _worktree_path(step_id)
    br_name = _branch_name(step_id)
    base = _get_default_branch()

    if wt_path.exists():
        return True, str(wt_path)

    wt_path.parent.mkdir(parents=True, exist_ok=True)
    result = _run_git(
        ["worktree", "add", str(wt_path), "-b", br_name, base],
        check=False,
    )
    if result.returncode != 0:
        return False, result.stderr
    return True, str(wt_path)


def _merge_worktree(step_id: str) -> tuple[bool, str]:
    """Merge a worktree branch into default branch. Returns (success, message)."""
    br_name = _branch_name(step_id)
    into_branch = _get_default_branch()

    # Check branch exists
    result = _run_git(["rev-parse", "--verify", br_name], check=False)
    if result.returncode != 0:
        return True, "NO_WORKTREE"  # No worktree to merge

    # Checkout target
    result = _run_git(["checkout", into_branch], check=False)
    if result.returncode != 0:
        return False, f"checkout failed: {result.stderr}"

    # Merge
    result = _run_git(
        ["merge", br_name, "--no-ff", "-m", f"Merge step {step_id}"],
        check=False,
    )
    if result.returncode != 0:
        status = _run_git(["status", "--porcelain"])
        if "UU " in status.stdout or "AA " in status.stdout:
            return False, "MERGE_CONFLICT"
        return False, f"merge failed: {result.stderr}"

    return True, "MERGE_OK"


def _cleanup_worktree(step_id: str) -> None:
    """Remove worktree and branch for a step."""
    wt_path = _worktree_path(step_id)
    br_name = _branch_name(step_id)

    if wt_path.exists():
        _run_git(["worktree", "remove", str(wt_path), "--force"], check=False)
    _run_git(["branch", "-D", br_name], check=False)


# --- Roadmap data helpers ---


def _get_step_files(step: dict) -> set[str]:
    """Get files_to_modify from a step."""
    return set(step.get("files_to_modify", []))


def _get_active_steps(data: dict) -> list[dict]:
    """Get all steps with active status (in_progress, review)."""
    return [
        s for s in _all_steps(data)
        if s.get("status") in {"in_progress", "review"}
    ]


def _detect_file_conflicts(step: dict, active_steps: list[dict]) -> list[str]:
    """Check if step's files conflict with any active step's files."""
    step_files = _get_step_files(step)
    conflicting_files = []
    for active in active_steps:
        if active.get("id") == step.get("id"):
            continue
        active_files = _get_step_files(active)
        overlap = step_files & active_files
        if overlap:
            conflicting_files.extend(overlap)
    return list(set(conflicting_files))


def _compute_conflicting_step_ids(step: dict, active_steps: list[dict]) -> list[str]:
    """Compute IDs of active steps that share files with the given step.

    Pure function: step dict, active_steps list -> list of conflicting step IDs.
    """
    step_files = _get_step_files(step)
    if not step_files:
        return []

    conflicting_ids = []
    for active in active_steps:
        if active.get("id") == step.get("id"):
            continue
        active_files = _get_step_files(active)
        if step_files & active_files:
            conflicting_ids.append(active.get("id"))

    return conflicting_ids


def _add_conflict_reference(step: dict, conflict_id: str) -> dict:
    """Return new step dict with conflict_id added to conflicts_with."""
    existing = step.get("conflicts_with", [])
    if conflict_id in existing:
        return step
    return {**step, "conflicts_with": [*existing, conflict_id]}


def _clear_conflict_references(steps: list[dict], completed_step_id: str) -> list[dict]:
    """Return new list of steps with conflict references for completed_step_id removed.

    - Completed step has conflicts_with removed entirely
    - Other steps have completed_step_id removed from their conflicts_with
    - Steps with empty conflicts_with have the field removed
    """
    def _clean_step(step: dict) -> dict:
        step_id = step.get("id")

        # Clear conflicts_with from the completed step itself
        if step_id == completed_step_id:
            return {k: v for k, v in step.items() if k != "conflicts_with"}

        conflicts = step.get("conflicts_with")
        if conflicts is None:
            return step

        remaining = [c for c in conflicts if c != completed_step_id]
        if not remaining:
            return {k: v for k, v in step.items() if k != "conflicts_with"}
        return {**step, "conflicts_with": remaining}

    return [_clean_step(s) for s in steps]


def _all_steps(data: dict) -> list[dict]:
    """Flatten all steps from all phases."""
    return [
        step
        for phase in data.get("phases", [])
        for step in phase.get("steps", [])
    ]


def _apply_steps(data: dict, steps: list[dict]) -> None:
    """Write cleaned steps back into the phase structure by matching IDs."""
    step_map = {s.get("id"): s for s in steps}
    for phase in data.get("phases", []):
        phase["steps"] = [step_map.get(s.get("id"), s) for s in phase.get("steps", [])]


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


def cmd_start_step(args: list[str]) -> int:
    """Start a step: detect conflicts, create worktree if needed, set in_progress.

    Output:
        STARTED {step_id} [SHARED]
        STARTED {step_id} [WORKTREE] {path}
    """
    parsed, roadmap_path, error_arg = _parse_args(args, ["step", "teammate"])
    if error_arg:
        print(f"Unknown argument: {error_arg}", file=sys.stderr)
        return 2

    step_id = parsed["step"]
    teammate_id = parsed["teammate"]

    if not roadmap_path or not step_id or not teammate_id:
        print("Error: ROADMAP_PATH, --step, and --teammate required", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(roadmap_path)
    if not roadmap_file:
        return 2

    data, fmt = load_roadmap(roadmap_file)

    step = _find_step(data, step_id)
    if step is None:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 1

    current_status = step.get("status", "pending")
    if current_status not in {"pending", "claimed"}:
        print(f"Error: step {step_id} is {current_status}, cannot start", file=sys.stderr)
        return 1

    # Check for file conflicts with active steps
    active_steps = _get_active_steps(data)
    conflicts = _detect_file_conflicts(step, active_steps)
    conflicting_step_ids = _compute_conflicting_step_ids(step, active_steps)

    use_worktree = bool(conflicts)
    worktree_path_str = None

    if use_worktree:
        success, result = _create_worktree(step_id)
        if not success:
            print(f"Error creating worktree: {result}", file=sys.stderr)
            return 1
        worktree_path_str = result

    # Update roadmap
    now = datetime.now(timezone.utc).isoformat()
    step["status"] = "in_progress"
    step["teammate_id"] = teammate_id
    step["started_at"] = now
    if use_worktree:
        step["worktree"] = worktree_path_str

    # Write conflicts_with for file overlap (mutual references)
    if conflicting_step_ids:
        step["conflicts_with"] = conflicting_step_ids
        # Update conflicting steps with mutual reference
        for conflict_id in conflicting_step_ids:
            conflict_step = _find_step(data, conflict_id)
            if conflict_step:
                updated = _add_conflict_reference(conflict_step, step_id)
                conflict_step.update(updated)

    save_roadmap(data, roadmap_file, fmt=fmt)

    if use_worktree:
        print(f"STARTED {step_id} [WORKTREE] {worktree_path_str}")
    else:
        print(f"STARTED {step_id} [SHARED]")

    return 0


def cmd_transition(args: list[str]) -> int:
    """Transition step to a new status.

    Valid transitions:
        in_progress -> review
        review -> in_progress (revision)

    Optional flags:
        --outcome approved|rejected - Review outcome to record in review_history
        --feedback STRING - Reviewer feedback text
    """
    parsed, roadmap_path, error_arg = _parse_args(args, ["step", "status", "outcome", "feedback"])
    if error_arg:
        print(f"Unknown argument: {error_arg}", file=sys.stderr)
        return 2

    step_id = parsed["step"]
    new_status = parsed["status"]
    outcome = parsed["outcome"]
    feedback = parsed["feedback"]

    if not roadmap_path or not step_id or not new_status:
        print("Error: ROADMAP_PATH, --step, and --status required", file=sys.stderr)
        return 2

    if outcome is not None and outcome not in {"approved", "rejected"}:
        print(f"Error: invalid outcome '{outcome}'. Valid: approved, rejected", file=sys.stderr)
        return 2

    if new_status not in {"in_progress", "review", "failed"}:
        print(f"Error: invalid transition status '{new_status}'. Valid: in_progress, review, failed", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(roadmap_path)
    if not roadmap_file:
        return 2

    data, fmt = load_roadmap(roadmap_file)

    step = _find_step(data, step_id)
    if step is None:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 1

    current_status = step.get("status", "pending")

    if (current_status, new_status) not in VALID_TRANSITIONS:
        print(f"Error: invalid transition {current_status} -> {new_status}", file=sys.stderr)
        return 1

    now = datetime.now(timezone.utc).isoformat()
    step["status"] = new_status

    if new_status == "review":
        step["review_attempts"] = step.get("review_attempts", 0) + 1

    if new_status == "failed":
        step["completed_at"] = now

    if outcome is not None:
        review_entry = {
            "cycle": step.get("review_attempts", 1),
            "timestamp": now,
            "outcome": outcome,
            "feedback": feedback if feedback is not None else "",
        }
        if "review_history" not in step:
            step["review_history"] = []
        step["review_history"].append(review_entry)

    save_roadmap(data, roadmap_file, fmt=fmt)

    print(f"TRANSITIONED {step_id}: {current_status} -> {new_status}")
    return 0


def cmd_complete_step(args: list[str]) -> int:
    """Complete a step: set approved, merge worktree if used.

    Optional flags:
        --outcome approved|rejected - Review outcome to record in review_history
        --feedback STRING - Reviewer feedback text

    Output:
        COMPLETED {step_id}
        COMPLETED {step_id} MERGE_OK
        COMPLETED {step_id} MERGE_CONFLICT (exit 1)
    """
    parsed, roadmap_path, error_arg = _parse_args(args, ["step", "outcome", "feedback"])
    if error_arg:
        print(f"Unknown argument: {error_arg}", file=sys.stderr)
        return 2

    step_id = parsed["step"]
    outcome = parsed["outcome"]
    feedback = parsed["feedback"]

    if not roadmap_path or not step_id:
        print("Error: ROADMAP_PATH and --step required", file=sys.stderr)
        return 2

    if outcome is not None and outcome not in {"approved", "rejected"}:
        print(f"Error: invalid outcome '{outcome}'. Valid: approved, rejected", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(roadmap_path)
    if not roadmap_file:
        return 2

    data, fmt = load_roadmap(roadmap_file)

    step = _find_step(data, step_id)
    if step is None:
        print(f"Error: step not found: {step_id}", file=sys.stderr)
        return 1

    current_status = step.get("status", "pending")
    if current_status != "review":
        print(f"Error: step {step_id} is {current_status}, must be in review to complete", file=sys.stderr)
        return 1

    now = datetime.now(timezone.utc).isoformat()
    had_worktree = step.get("worktree") is not None

    # Record review history entry (if outcome provided) — safe before merge
    if outcome is not None:
        review_entry = {
            "cycle": step.get("review_attempts", 1),
            "timestamp": now,
            "outcome": outcome,
            "feedback": feedback if feedback is not None else "",
        }
        if "review_history" not in step:
            step["review_history"] = []
        step["review_history"].append(review_entry)

    # Merge worktree BEFORE persisting approved status.
    # On merge failure, step stays as 'review' so recovery can handle it.
    if had_worktree:
        success, result = _merge_worktree(step_id)
        if not success:
            # Save review history but keep status as 'review'
            save_roadmap(data, roadmap_file, fmt=fmt)
            if result == "MERGE_CONFLICT":
                print(f"COMPLETED {step_id} MERGE_CONFLICT")
                return 1
            print(f"Error merging worktree: {result}", file=sys.stderr)
            return 1
        _cleanup_worktree(step_id)

    # Merge succeeded (or no worktree) — now persist approved status
    step["status"] = "approved"
    step["completed_at"] = now
    cleaned_steps = _clear_conflict_references(_all_steps(data), step_id)
    _apply_steps(data, cleaned_steps)
    save_roadmap(data, roadmap_file, fmt=fmt)

    if had_worktree:
        print(f"COMPLETED {step_id} MERGE_OK")
    else:
        print(f"COMPLETED {step_id}")

    return 0


def cmd_update(args: list[str]) -> int:
    """Update step status in roadmap file."""
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

    data, fmt = load_roadmap(roadmap_file)

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

    save_roadmap(data, roadmap_file, fmt=fmt)

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

    data, _fmt = load_roadmap(roadmap_file)
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


def _get_step_deps(step: dict) -> list[str]:
    """Get dependency IDs from a step, supporting both 'dependencies' and 'deps' keys."""
    return step.get("dependencies") or step.get("deps") or []


def _compute_ready_steps(steps: list[dict]) -> list[dict]:
    """Compute steps that are ready to start (Kahn's algorithm).

    A step is READY when:
    - Own status is "pending"
    - All dependencies have status "approved"

    Returns steps sorted by ID for deterministic output.
    """
    status_map = {s.get("id"): s.get("status", "pending") for s in steps}

    ready = []
    for step in steps:
        if step.get("status", "pending") != "pending":
            continue
        deps = _get_step_deps(step)
        if all(status_map.get(dep) == "approved" for dep in deps):
            ready.append(step)

    return sorted(ready, key=lambda s: s.get("id", ""))


def _format_isolation_tag(step: dict, active_steps: list[dict]) -> str:
    """Compute isolation tag for a ready step.

    Returns "[SHARED]" or "[WORKTREE conflicts_with:{ids}]" based on file overlap
    with currently active steps.
    """
    conflicting_ids = _compute_conflicting_step_ids(step, active_steps)
    if not conflicting_ids:
        return "[SHARED]"
    return f"[WORKTREE conflicts_with:{','.join(conflicting_ids)}]"


def cmd_next_steps(args: list[str]) -> int:
    """Show which steps are ready to start based on dependency resolution.

    Uses Kahn's algorithm: a step is READY when all deps are approved
    and own status is pending. Annotates each step with isolation mode.

    Output:
        READY {step_id} [SHARED] {step_name}                          (no file conflicts)
        READY {step_id} [WORKTREE conflicts_with:{ids}] {step_name}   (file conflicts with active steps)
        DONE                                                           (when all steps are approved)
    """
    if not args:
        print("Error: ROADMAP_PATH required", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(args[0])
    if not roadmap_file:
        return 2

    data, _fmt = load_roadmap(roadmap_file)
    steps = _all_steps(data)

    # Check if all steps are approved
    if all(s.get("status", "pending") == "approved" for s in steps):
        print("DONE")
        return 0

    active_steps = _get_active_steps(data)
    ready = _compute_ready_steps(steps)
    for step in ready:
        tag = _format_isolation_tag(step, active_steps)
        print(f"READY {step.get('id', '?')} {tag} {step.get('name', '')}")

    return 0


def cmd_recover(args: list[str]) -> int:
    """Reset in_progress/claimed/review steps to pending for interruption recovery.

    Cleans up orphaned worktrees for reset steps. Approved steps are preserved.

    Output:
        RECOVERED {step_id}     (one per reset step)
        CLEAN                   (when no steps needed recovery)
    """
    if not args:
        print("Error: ROADMAP_PATH required", file=sys.stderr)
        return 2

    roadmap_file = _validate_roadmap_file(args[0])
    if not roadmap_file:
        return 2

    data, fmt = load_roadmap(roadmap_file)
    steps = _all_steps(data)

    # Identify steps to recover and perform worktree cleanup (side-effects)
    active_step_ids = []
    for step in steps:
        if step.get("status", "pending") in ACTIVE_STATUSES:
            step_id = step.get("id", "?")
            if step.get("worktree"):
                _cleanup_worktree(step_id)
            active_step_ids.append(step_id)

    if not active_step_ids:
        print("CLEAN")
        return 0

    # Apply data transformations: clear conflicts and reset steps
    TRANSIENT_FIELDS = {"teammate_id", "started_at", "review_attempts", "review_history", "completed_at", "worktree"}

    for step_id in active_step_ids:
        steps = _clear_conflict_references(steps, step_id)

    def _reset_step(step: dict) -> dict:
        if step.get("id") not in active_step_ids:
            return step
        return {
            k: v for k, v in step.items()
            if k not in TRANSIENT_FIELDS and k != "status"
        } | {"status": "pending"}

    cleaned_steps = [_reset_step(s) for s in steps]
    _apply_steps(data, cleaned_steps)
    save_roadmap(data, roadmap_file, fmt=fmt)

    for step_id in active_step_ids:
        print(f"RECOVERED {step_id}")

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

    data, _fmt = load_roadmap(roadmap_file)

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
        print("Usage: python -m en.cli.team_state {start-step|transition|complete-step|update|show|check|recover} [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    commands = {
        "start-step": cmd_start_step,
        "transition": cmd_transition,
        "complete-step": cmd_complete_step,
        "update": cmd_update,
        "show": cmd_show,
        "check": cmd_check,
        "next-steps": cmd_next_steps,
        "recover": cmd_recover,
    }

    if subcommand not in commands:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2

    return commands[subcommand](sub_args)


if __name__ == "__main__":
    sys.exit(main())

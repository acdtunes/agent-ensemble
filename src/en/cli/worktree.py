"""CLI: Git worktree management for parallel teammates.

Usage:
    python -m en.cli.worktree create STEP_ID [--base BRANCH]
    python -m en.cli.worktree list
    python -m en.cli.worktree merge STEP_ID [--into BRANCH]
    python -m en.cli.worktree merge-all [--into BRANCH] [--plan PLAN_PATH]
    python -m en.cli.worktree cleanup [--all | STEP_ID]
    python -m en.cli.worktree status

Exit codes:
    0 = Success
    1 = Operation failed (conflict, etc.)
    2 = Usage error
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple

from en.git import (
    BRANCH_PREFIX,
    branch_name,
    get_default_branch,
    get_repo_root,
    run_git,
    worktree_path,
)


class WorktreeInfo(NamedTuple):
    step_id: str
    path: str
    branch: str
    has_changes: bool
    commit_count: int


def _parse_worktree_porcelain(stdout: str) -> list[dict]:
    """Parse git worktree list --porcelain output into list of dicts."""
    worktrees: list[dict] = []
    current: dict = {}

    for line in stdout.strip().split("\n"):
        if line.startswith("worktree "):
            if current:
                worktrees.append(current)
            current = {"path": line[9:]}
        elif line.startswith("branch "):
            current["branch"] = line[7:]
        elif line == "":
            if current:
                worktrees.append(current)
            current = {}

    if current:
        worktrees.append(current)

    return worktrees


def _filter_en_worktrees(worktrees: list[dict]) -> list[dict]:
    """Filter worktrees to only agent-ensemble ones (by branch prefix)."""
    return [
        wt for wt in worktrees
        if wt.get("branch", "").startswith(f"refs/heads/{BRANCH_PREFIX}")
    ]


def cmd_create(args: list[str]) -> int:
    """Create a worktree for a step."""
    step_id = None
    base_branch = None

    i = 0
    while i < len(args):
        if args[i] == "--base" and i + 1 < len(args):
            base_branch = args[i + 1]
            i += 2
        elif not step_id:
            step_id = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not step_id:
        print("Error: step_id required", file=sys.stderr)
        return 2

    if not base_branch:
        base_branch = get_default_branch()

    wt_path = worktree_path(step_id)
    br_name = branch_name(step_id)

    # Check if worktree already exists
    if wt_path.exists():
        print(f"Worktree already exists: {wt_path}")
        return 0

    # Create parent directory
    wt_path.parent.mkdir(parents=True, exist_ok=True)

    # Create worktree with new branch
    result = run_git(
        ["worktree", "add", str(wt_path), "-b", br_name, base_branch],
        check=False,
    )

    if result.returncode != 0:
        print(f"Error creating worktree: {result.stderr}", file=sys.stderr)
        return 1

    print(f"Created worktree: {wt_path}")
    print(f"Branch: {br_name}")
    print(f"Based on: {base_branch}")

    return 0


def cmd_list(args: list[str]) -> int:
    """List all agent-ensemble worktrees."""
    result = run_git(["worktree", "list", "--porcelain"])
    en_worktrees = _filter_en_worktrees(_parse_worktree_porcelain(result.stdout))

    if not en_worktrees:
        print("No agent-ensemble worktrees found.")
        return 0

    print(f"=== agent-ensemble Worktrees ({len(en_worktrees)}) ===")
    for wt in en_worktrees:
        branch = wt["branch"].replace("refs/heads/", "")
        step_id = branch.replace(BRANCH_PREFIX, "")
        print(f"  {step_id}: {wt['path']} ({branch})")

    return 0


def _do_merge(step_id: str, into_branch: str) -> tuple[bool, str]:
    """Merge a worktree branch into target branch.

    Returns (success, message). Pure git operation without CLI arg parsing.
    """
    br_name = branch_name(step_id)

    # Check branch exists
    result = run_git(["rev-parse", "--verify", br_name], check=False)
    if result.returncode != 0:
        return False, f"branch not found: {br_name}"

    # Checkout target branch
    result = run_git(["checkout", into_branch], check=False)
    if result.returncode != 0:
        return False, f"checkout failed: {result.stderr}"

    # Merge worktree branch
    result = run_git(
        ["merge", br_name, "--no-ff", "-m", f"Merge step {step_id}"],
        check=False,
    )

    if result.returncode != 0:
        status = run_git(["status", "--porcelain"])
        if "UU " in status.stdout or "AA " in status.stdout:
            conflicting = [
                line[3:]
                for line in status.stdout.strip().split("\n")
                if line.startswith("UU ") or line.startswith("AA ")
            ]
            return False, f"MERGE_CONFLICT:{','.join(conflicting)}"
        return False, f"merge failed: {result.stderr}"

    return True, f"Successfully merged {br_name} into {into_branch}"


def cmd_merge(args: list[str]) -> int:
    """Merge a worktree branch back into target branch."""
    step_id = None
    into_branch = None

    i = 0
    while i < len(args):
        if args[i] == "--into" and i + 1 < len(args):
            into_branch = args[i + 1]
            i += 2
        elif not step_id:
            step_id = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not step_id:
        print("Error: step_id required", file=sys.stderr)
        return 2

    if not into_branch:
        into_branch = get_default_branch()

    success, message = _do_merge(step_id, into_branch)

    if not success:
        if message.startswith("MERGE_CONFLICT:"):
            conflicting_files = message.split(":", 1)[1].split(",")
            br_name = branch_name(step_id)
            print(f"MERGE CONFLICT merging {br_name}")
            print("Conflicting files:")
            for f in conflicting_files:
                print(f"  {f}")
            print()
            print("Resolve conflicts, then run:")
            print(f"  git add . && git commit")
            print("Or abort with:")
            print(f"  git merge --abort")
        else:
            print(f"Error: {message}", file=sys.stderr)
        return 1

    print(message)
    return 0


def cmd_merge_all(args: list[str]) -> int:
    """Merge all worktree branches in order."""
    into_branch = None
    plan_path = None

    i = 0
    while i < len(args):
        if args[i] == "--into" and i + 1 < len(args):
            into_branch = args[i + 1]
            i += 2
        elif args[i] == "--plan" and i + 1 < len(args):
            plan_path = args[i + 1]
            i += 2
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not into_branch:
        into_branch = get_default_branch()

    # Get ordered step IDs
    step_ids: list[str] = []

    if plan_path:
        from en.adapters._io import load_yaml_or_json
        plan, _ = load_yaml_or_json(Path(plan_path))
        for layer in plan.get("layers", []):
            for step in layer.get("steps", []):
                step_ids.append(step["step_id"])
    else:
        # List existing worktrees and extract step IDs
        result = run_git(["worktree", "list", "--porcelain"])
        for line in result.stdout.strip().split("\n"):
            if line.startswith("branch refs/heads/" + BRANCH_PREFIX):
                sid = line.replace(f"branch refs/heads/{BRANCH_PREFIX}", "")
                step_ids.append(sid)

    if not step_ids:
        print("No worktrees to merge.")
        return 0

    print(f"Merging {len(step_ids)} worktree branches into {into_branch}...")
    print()

    failed = []
    for step_id in step_ids:
        br_name = branch_name(step_id)
        # Check if branch exists
        result = run_git(["rev-parse", "--verify", br_name], check=False)
        if result.returncode != 0:
            print(f"  Skipping {step_id}: branch not found")
            continue

        success, message = _do_merge(step_id, into_branch)
        if not success:
            failed.append(step_id)
            print(f"  FAILED: {step_id}")
            break
        else:
            print(f"  OK: {step_id}")

    if failed:
        print()
        print(f"Merge stopped at step {failed[0]}. Resolve conflict and retry.")
        return 1

    print()
    print(f"All branches merged successfully into {into_branch}")
    return 0


def cmd_cleanup(args: list[str]) -> int:
    """Remove worktrees and their branches."""
    cleanup_all = False
    step_id = None

    for arg in args:
        if arg == "--all":
            cleanup_all = True
        elif not step_id:
            step_id = arg

    if not cleanup_all and not step_id:
        print("Error: specify --all or a step_id", file=sys.stderr)
        return 2

    step_ids = []
    if cleanup_all:
        # Get all en worktree branches
        result = run_git(["worktree", "list", "--porcelain"])
        for line in result.stdout.strip().split("\n"):
            if line.startswith(f"branch refs/heads/{BRANCH_PREFIX}"):
                sid = line.replace(f"branch refs/heads/{BRANCH_PREFIX}", "")
                step_ids.append(sid)
    else:
        step_ids = [step_id]

    if not step_ids:
        print("No worktrees to clean up.")
        return 0

    for sid in step_ids:
        wt_path = worktree_path(sid)
        br_name = branch_name(sid)

        # Remove worktree
        if wt_path.exists():
            result = run_git(["worktree", "remove", str(wt_path), "--force"], check=False)
            if result.returncode == 0:
                print(f"Removed worktree: {wt_path}")
            else:
                print(f"Warning: could not remove worktree {wt_path}: {result.stderr}")

        # Delete branch
        result = run_git(["branch", "-D", br_name], check=False)
        if result.returncode == 0:
            print(f"Deleted branch: {br_name}")
        else:
            print(f"Warning: could not delete branch {br_name}: {result.stderr}")

    return 0


def cmd_status(args: list[str]) -> int:
    """Show status of all agent-ensemble worktrees."""
    result = run_git(["worktree", "list", "--porcelain"])
    all_worktrees = _filter_en_worktrees(_parse_worktree_porcelain(result.stdout))

    # Enrich with git status info
    en_worktrees = []
    for wt in all_worktrees:
        branch = wt.get("branch", "")

        step_id = branch.replace(f"refs/heads/{BRANCH_PREFIX}", "")
        path = wt["path"]

        # Check for uncommitted changes
        status_result = run_git(
            ["-C", path, "status", "--porcelain"],
            check=False,
        )
        has_changes = bool(status_result.stdout.strip())

        # Count commits ahead of base
        base = get_default_branch()
        log_result = run_git(
            ["-C", path, "rev-list", "--count", f"{base}..HEAD"],
            check=False,
        )
        commit_count = int(log_result.stdout.strip()) if log_result.returncode == 0 else 0

        en_worktrees.append(WorktreeInfo(
            step_id=step_id,
            path=path,
            branch=branch.replace("refs/heads/", ""),
            has_changes=has_changes,
            commit_count=commit_count,
        ))

    if not en_worktrees:
        print("No agent-ensemble worktrees found.")
        return 0

    print(f"=== agent-ensemble Worktree Status ===")
    print()
    for wt in en_worktrees:
        status_marker = "DIRTY" if wt.has_changes else "clean"
        print(f"Step {wt.step_id}:")
        print(f"  Path: {wt.path}")
        print(f"  Branch: {wt.branch}")
        print(f"  Commits: {wt.commit_count}")
        print(f"  Status: {status_marker}")
        print()

    return 0


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m en.cli.worktree {create|list|merge|merge-all|cleanup|status} [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    commands = {
        "create": cmd_create,
        "list": cmd_list,
        "merge": cmd_merge,
        "merge-all": cmd_merge_all,
        "cleanup": cmd_cleanup,
        "status": cmd_status,
    }

    if subcommand not in commands:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2

    return commands[subcommand](sub_args)


if __name__ == "__main__":
    sys.exit(main())

"""CLI: Git worktree management for parallel teammates.

Usage:
    python -m agent_ensemble.cli.worktree create STEP_ID [--base BRANCH]
    python -m agent_ensemble.cli.worktree list
    python -m agent_ensemble.cli.worktree merge STEP_ID [--into BRANCH]
    python -m agent_ensemble.cli.worktree merge-all [--into BRANCH] [--plan PLAN_PATH]
    python -m agent_ensemble.cli.worktree cleanup [--all | STEP_ID]
    python -m agent_ensemble.cli.worktree status

Exit codes:
    0 = Success
    1 = Operation failed (conflict, etc.)
    2 = Usage error
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

import yaml


WORKTREE_DIR = ".claude/worktrees"
BRANCH_PREFIX = "worktree-crafter-"


class WorktreeInfo(NamedTuple):
    step_id: str
    path: str
    branch: str
    has_changes: bool
    commit_count: int


def run_git(args: list[str], check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    """Run a git command."""
    cmd = ["git"] + args
    return subprocess.run(
        cmd,
        capture_output=capture,
        text=True,
        check=check,
    )


def get_repo_root() -> Path:
    """Get the repository root directory."""
    result = run_git(["rev-parse", "--show-toplevel"])
    return Path(result.stdout.strip())


def get_default_branch() -> str:
    """Get the default branch (main or master)."""
    result = run_git(["symbolic-ref", "refs/remotes/origin/HEAD"], check=False)
    if result.returncode == 0:
        return result.stdout.strip().split("/")[-1]
    # Fallback
    for branch in ["main", "master"]:
        result = run_git(["rev-parse", "--verify", branch], check=False)
        if result.returncode == 0:
            return branch
    return "main"


def worktree_path(step_id: str) -> Path:
    """Get worktree path for a step."""
    repo_root = get_repo_root()
    return repo_root / WORKTREE_DIR / f"crafter-{step_id}"


def branch_name(step_id: str) -> str:
    """Get branch name for a step's worktree."""
    return f"{BRANCH_PREFIX}{step_id}"


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

    worktrees = []
    current = {}

    for line in result.stdout.strip().split("\n"):
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

    # Filter to agent-ensemble worktrees
    nw_worktrees = [
        wt for wt in worktrees
        if wt.get("branch", "").startswith(f"refs/heads/{BRANCH_PREFIX}")
    ]

    if not nw_worktrees:
        print("No agent-ensemble worktrees found.")
        return 0

    print(f"=== agent-ensemble Worktrees ({len(nw_worktrees)}) ===")
    for wt in nw_worktrees:
        branch = wt["branch"].replace("refs/heads/", "")
        step_id = branch.replace(BRANCH_PREFIX, "")
        print(f"  {step_id}: {wt['path']} ({branch})")

    return 0


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

    br_name = branch_name(step_id)

    # Check branch exists
    result = run_git(["rev-parse", "--verify", br_name], check=False)
    if result.returncode != 0:
        print(f"Error: branch not found: {br_name}", file=sys.stderr)
        return 1

    # Get current branch to restore later
    orig_branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()

    # Checkout target branch
    result = run_git(["checkout", into_branch], check=False)
    if result.returncode != 0:
        print(f"Error checking out {into_branch}: {result.stderr}", file=sys.stderr)
        return 1

    # Merge worktree branch
    result = run_git(
        ["merge", br_name, "--no-ff", "-m", f"Merge step {step_id}"],
        check=False,
    )

    if result.returncode != 0:
        # Check for conflicts
        status = run_git(["status", "--porcelain"])
        if "UU " in status.stdout or "AA " in status.stdout:
            print(f"MERGE CONFLICT merging {br_name}")
            print("Conflicting files:")
            for line in status.stdout.strip().split("\n"):
                if line.startswith("UU ") or line.startswith("AA "):
                    print(f"  {line[3:]}")
            print()
            print("Resolve conflicts, then run:")
            print(f"  git add . && git commit")
            print("Or abort with:")
            print(f"  git merge --abort")
            return 1
        else:
            print(f"Merge failed: {result.stderr}", file=sys.stderr)
            return 1

    print(f"Successfully merged {br_name} into {into_branch}")

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
    step_ids = []

    if plan_path:
        plan = yaml.safe_load(Path(plan_path).read_text())
        for layer in plan.get("layers", []):
            for step in layer.get("steps", []):
                step_ids.append(step["step_id"])
    else:
        # List existing worktrees and extract step IDs
        result = run_git(["worktree", "list", "--porcelain"])
        for line in result.stdout.strip().split("\n"):
            if line.startswith("branch refs/heads/" + BRANCH_PREFIX):
                step_id = line.replace(f"branch refs/heads/{BRANCH_PREFIX}", "")
                step_ids.append(step_id)

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

        result_code = cmd_merge([step_id, "--into", into_branch])
        if result_code != 0:
            failed.append(step_id)
            print(f"  FAILED: {step_id}")
            break  # Stop on first failure
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
        # Get all agent-ensemble worktree branches
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

    worktrees = []
    current = {}

    for line in result.stdout.strip().split("\n"):
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

    # Filter and enrich
    nw_worktrees = []
    for wt in worktrees:
        branch = wt.get("branch", "")
        if not branch.startswith(f"refs/heads/{BRANCH_PREFIX}"):
            continue

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

        nw_worktrees.append(WorktreeInfo(
            step_id=step_id,
            path=path,
            branch=branch.replace("refs/heads/", ""),
            has_changes=has_changes,
            commit_count=commit_count,
        ))

    if not nw_worktrees:
        print("No agent-ensemble worktrees found.")
        return 0

    print(f"=== agent-ensemble Worktree Status ===")
    print()
    for wt in nw_worktrees:
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
        print("Usage: python -m agent_ensemble.cli.worktree {create|list|merge|merge-all|cleanup|status} [OPTIONS]")
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

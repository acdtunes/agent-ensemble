"""Git helpers shared across CLI modules.

Provides common git operations used by team_state and worktree modules.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

WORKTREE_DIR = ".claude/worktrees"
BRANCH_PREFIX = "worktree-crafter-"


def run_git(args: list[str], check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    """Run a git command."""
    return subprocess.run(
        ["git"] + args,
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
    for branch in ["main", "master"]:
        result = run_git(["rev-parse", "--verify", branch], check=False)
        if result.returncode == 0:
            return branch
    return "main"


def worktree_path(step_id: str) -> Path:
    """Get worktree path for a step."""
    return get_repo_root() / WORKTREE_DIR / f"crafter-{step_id}"


def branch_name(step_id: str) -> str:
    """Get branch name for a step's worktree."""
    return f"{BRANCH_PREFIX}{step_id}"

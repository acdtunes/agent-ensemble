"""CLI: Analyze roadmap and identify parallel execution groups.

Usage:
    python -m nw_teams.cli.parallel_groups analyze ROADMAP_PATH

Exit codes:
    0 = Success
    1 = Validation errors
    2 = Usage error
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple

import yaml


class Step(NamedTuple):
    step_id: str
    name: str
    files_to_modify: list[str]
    blocked_by: list[str]
    phase_id: str
    description: str = ""


class ParallelGroup(NamedTuple):
    layer: int
    steps: list[Step]
    has_file_conflicts: bool
    conflicting_pairs: list[tuple[str, str, list[str]]]  # (step_a, step_b, files)


def extract_steps(roadmap: dict) -> list[Step]:
    """Extract steps from roadmap.yaml using CANONICAL DES schema.

    Canonical field names (from ~/.claude/templates/roadmap-schema.yaml):
    - phase: id, name, steps
    - step: id, name, criteria, files_to_modify, deps

    Raises ValueError if:
    - Missing 'roadmap:' wrapper
    - Non-canonical field names detected (suggests invalid roadmap)
    - Any step has empty files_to_modify
    """
    steps = []

    # Validate roadmap wrapper exists
    if "roadmap" not in roadmap:
        raise ValueError(
            "Missing 'roadmap:' wrapper. Roadmap must have canonical DES schema. "
            "Use `des.cli.roadmap validate` to check, or `/nw:roadmap` to create."
        )

    for phase in roadmap.get("phases", []):
        # Strict: require canonical 'id' field
        phase_id = phase.get("id")
        if phase_id is None:
            if "phase_id" in phase:
                raise ValueError(
                    f"Phase uses 'phase_id' instead of 'id'. Use canonical DES schema. "
                    f"Run `des.cli.roadmap validate` to check your roadmap."
                )
            raise ValueError(
                f"Phase missing required 'id' field. Use canonical DES schema."
            )

        for step in phase.get("steps", []):
            # Strict: require canonical 'id' field
            step_id = step.get("id")
            if step_id is None:
                if "step_id" in step:
                    raise ValueError(
                        f"Step uses 'step_id' instead of 'id'. Use canonical DES schema."
                    )
                raise ValueError(
                    f"Step in phase {phase_id} missing required 'id' field."
                )

            name = step.get("name", "")

            # Strict: require canonical 'files_to_modify' field
            files = step.get("files_to_modify")
            if files is None:
                if "implementation_scope" in step:
                    raise ValueError(
                        f"Step {step_id} uses 'implementation_scope' instead of 'files_to_modify'. "
                        f"Use canonical DES schema."
                    )
                if "files" in step:
                    raise ValueError(
                        f"Step {step_id} uses 'files' instead of 'files_to_modify'. "
                        f"Use canonical DES schema."
                    )
                raise ValueError(
                    f"Step {step_id} missing required 'files_to_modify' field. "
                    f"nw-teams requires files_to_modify for parallel conflict detection "
                    f"(DES marks it optional, but nw-teams REQUIRES it)."
                )

            if not files:
                raise ValueError(
                    f"Step {step_id} ({name}) has empty files_to_modify. "
                    f"nw-teams requires at least one file per step for conflict detection."
                )

            # Accept both 'deps' (canonical) and 'dependencies' (common alias)
            blocked_by = step.get("deps", step.get("dependencies", []))
            description = step.get("description", "")
            steps.append(Step(step_id, name, files, blocked_by, phase_id, description))
    return steps


def build_dependency_graph(steps: list[Step]) -> dict[str, set[str]]:
    """Build adjacency list: step_id -> set of steps it depends on."""
    return {step.step_id: set(step.blocked_by) for step in steps}


def detect_file_conflicts(steps: list[Step]) -> list[tuple[str, str, list[str]]]:
    """Find pairs of steps that modify the same files."""
    conflicts = []
    for i, step_a in enumerate(steps):
        for step_b in steps[i + 1:]:
            files_a = set(step_a.files_to_modify)
            files_b = set(step_b.files_to_modify)
            overlap = files_a & files_b
            if overlap:
                conflicts.append((step_a.step_id, step_b.step_id, list(overlap)))
    return conflicts


def topological_layers(steps: list[Step], graph: dict[str, set[str]]) -> list[list[Step]]:
    """Group steps into layers using Kahn's algorithm."""
    step_map = {s.step_id: s for s in steps}
    in_degree: dict[str, int] = {s.step_id: 0 for s in steps}

    for step_id, deps in graph.items():
        in_degree[step_id] = len(deps)

    layers: list[list[Step]] = []
    remaining = set(s.step_id for s in steps)

    while remaining:
        # Find all steps with no remaining dependencies
        ready = [sid for sid in remaining if in_degree[sid] == 0]
        if not ready:
            # Cycle detected
            print(f"Warning: circular dependency detected among {remaining}", file=sys.stderr)
            break

        layer = [step_map[sid] for sid in ready]
        layers.append(layer)

        # Remove from remaining and decrease in_degree for dependents
        for sid in ready:
            remaining.remove(sid)
            for other_sid, deps in graph.items():
                if sid in deps:
                    in_degree[other_sid] -= 1

    return layers


def identify_parallel_groups(steps: list[Step]) -> list[ParallelGroup]:
    """Identify parallel execution groups from steps."""
    graph = build_dependency_graph(steps)
    layers = topological_layers(steps, graph)

    groups = []
    for i, layer_steps in enumerate(layers):
        conflicts = detect_file_conflicts(layer_steps)
        has_conflicts = bool(conflicts)
        groups.append(ParallelGroup(
            layer=i + 1,
            steps=layer_steps,
            has_file_conflicts=has_conflicts,
            conflicting_pairs=conflicts,
        ))

    return groups


def print_analysis(groups: list[ParallelGroup]) -> None:
    """Print human-readable analysis."""
    total_steps = sum(len(group.steps) for group in groups)
    max_parallel = max(len(group.steps) for group in groups) if groups else 0

    print(f"=== Parallel Execution Analysis ===")
    print(f"Total steps: {total_steps}")
    print(f"Layers: {len(groups)}")
    print(f"Max parallelism: {max_parallel} steps")
    print(f"Estimated speedup: {total_steps / len(groups):.1f}x" if groups else "N/A")
    print()

    for group in groups:
        conflict_marker = " [FILE CONFLICTS - USE WORKTREES]" if group.has_file_conflicts else ""
        parallel_marker = "(parallel)" if len(group.steps) > 1 else "(sequential)"
        print(f"Layer {group.layer} {parallel_marker}{conflict_marker}:")
        for step in group.steps:
            print(f"  - {step.step_id}: {step.name}")
            if step.files_to_modify:
                print(f"      files: {', '.join(step.files_to_modify[:3])}" +
                      ("..." if len(step.files_to_modify) > 3 else ""))

        if group.conflicting_pairs:
            print(f"  Conflicts:")
            for step_a, step_b, files in group.conflicting_pairs:
                print(f"    - {step_a} <-> {step_b}: {', '.join(files)}")
        print()


def cmd_analyze(args: list[str]) -> int:
    """Handle 'analyze' subcommand."""
    if not args:
        print("Error: roadmap path required", file=sys.stderr)
        return 2

    roadmap_path = Path(args[0])
    if not roadmap_path.exists():
        print(f"Error: file not found: {roadmap_path}", file=sys.stderr)
        return 2

    roadmap = yaml.safe_load(roadmap_path.read_text())
    steps = extract_steps(roadmap)

    if not steps:
        print("Error: no steps found in roadmap", file=sys.stderr)
        return 1

    groups = identify_parallel_groups(steps)
    print_analysis(groups)

    return 0


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m nw_teams.cli.parallel_groups analyze [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    if subcommand == "analyze":
        return cmd_analyze(sub_args)
    else:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

"""CLI: Analyze roadmap and identify parallel execution groups.

Usage:
    python -m nw_teams.cli.parallel_groups analyze ROADMAP_PATH
    python -m nw_teams.cli.parallel_groups plan ROADMAP_PATH --output PLAN_PATH

Exit codes:
    0 = Success
    1 = Validation errors
    2 = Usage error
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import NamedTuple

import yaml


class Step(NamedTuple):
    step_id: str
    name: str
    files_to_modify: list[str]
    blocked_by: list[str]
    phase_id: str


class ParallelGroup(NamedTuple):
    layer: int
    steps: list[Step]
    has_file_conflicts: bool
    conflicting_pairs: list[tuple[str, str, list[str]]]  # (step_a, step_b, files)


def extract_steps(roadmap: dict) -> list[Step]:
    """Extract steps from roadmap.yaml."""
    steps = []
    for phase in roadmap.get("phases", []):
        phase_id = phase.get("phase_id", phase.get("id", ""))
        for step in phase.get("steps", []):
            step_id = step.get("step_id", step.get("id", ""))
            name = step.get("name", "")
            files = step.get("files_to_modify", [])
            blocked_by = step.get("blocked_by", [])
            steps.append(Step(step_id, name, files, blocked_by, phase_id))
    return steps


def build_dependency_graph(steps: list[Step]) -> dict[str, set[str]]:
    """Build adjacency list: step_id -> set of steps it depends on."""
    graph: dict[str, set[str]] = {}
    for step in steps:
        graph[step.step_id] = set(step.blocked_by)
    return graph


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

        # Remove from remaining and update in_degree
        for sid in ready:
            remaining.remove(sid)
            # Decrease in_degree for steps that depended on this
            for other_sid in remaining:
                if sid in graph.get(other_sid, set()):
                    # This logic is inverted - we need reverse edges
                    pass

        # Actually: decrease in_degree for dependents
        for sid in ready:
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
        has_conflicts = len(conflicts) > 0
        groups.append(ParallelGroup(
            layer=i + 1,
            steps=layer_steps,
            has_file_conflicts=has_conflicts,
            conflicting_pairs=conflicts,
        ))

    return groups


def print_analysis(groups: list[ParallelGroup]) -> None:
    """Print human-readable analysis."""
    total_steps = sum(len(g.steps) for g in groups)
    max_parallel = max(len(g.steps) for g in groups) if groups else 0

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


def generate_plan(groups: list[ParallelGroup]) -> dict:
    """Generate execution plan as structured data."""
    # Build a global map of step_id -> files for cross-layer conflict detection
    all_steps: list[Step] = []
    for group in groups:
        all_steps.extend(group.steps)

    # Pre-compute per-step conflicts_with across ALL steps (not just same layer)
    step_conflicts: dict[str, list[str]] = {s.step_id: [] for s in all_steps}
    for i, step_a in enumerate(all_steps):
        files_a = set(step_a.files_to_modify)
        if not files_a:
            continue
        for step_b in all_steps[i + 1:]:
            files_b = set(step_b.files_to_modify)
            overlap = files_a & files_b
            if overlap:
                step_conflicts[step_a.step_id].append(step_b.step_id)
                step_conflicts[step_b.step_id].append(step_a.step_id)

    plan = {
        "schema_version": "1.0",
        "summary": {
            "total_steps": sum(len(g.steps) for g in groups),
            "total_layers": len(groups),
            "max_parallelism": max(len(g.steps) for g in groups) if groups else 0,
            "requires_worktrees": any(g.has_file_conflicts for g in groups),
        },
        "layers": [],
    }

    for group in groups:
        layer = {
            "layer": group.layer,
            "parallel": len(group.steps) > 1,
            "use_worktrees": group.has_file_conflicts,
            "steps": [],
        }
        for s in group.steps:
            step_data: dict = {
                "step_id": s.step_id,
                "name": s.name,
                "files_to_modify": s.files_to_modify,
            }
            if step_conflicts[s.step_id]:
                step_data["conflicts_with"] = sorted(step_conflicts[s.step_id])
            layer["steps"].append(step_data)

        if group.conflicting_pairs:
            layer["file_conflicts"] = [
                {"step_a": a, "step_b": b, "files": f}
                for a, b, f in group.conflicting_pairs
            ]
        plan["layers"].append(layer)

    return plan


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


def cmd_plan(args: list[str]) -> int:
    """Handle 'plan' subcommand."""
    roadmap_path = None
    output_path = None

    i = 0
    while i < len(args):
        if args[i] == "--output" and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        elif not roadmap_path:
            roadmap_path = args[i]
            i += 1
        else:
            print(f"Unknown argument: {args[i]}", file=sys.stderr)
            return 2

    if not roadmap_path:
        print("Error: roadmap path required", file=sys.stderr)
        return 2

    roadmap_file = Path(roadmap_path)
    if not roadmap_file.exists():
        print(f"Error: file not found: {roadmap_file}", file=sys.stderr)
        return 2

    roadmap = yaml.safe_load(roadmap_file.read_text())
    steps = extract_steps(roadmap)

    if not steps:
        print("Error: no steps found in roadmap", file=sys.stderr)
        return 1

    groups = identify_parallel_groups(steps)
    plan = generate_plan(groups)

    if output_path:
        Path(output_path).write_text(
            yaml.dump(plan, default_flow_style=False, sort_keys=False)
        )
        print(f"Execution plan written to {output_path}")
    else:
        print(yaml.dump(plan, default_flow_style=False, sort_keys=False))

    return 0


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m nw_teams.cli.parallel_groups {analyze|plan} [OPTIONS]")
        return 2

    subcommand = argv[0]
    sub_args = argv[1:]

    if subcommand == "analyze":
        return cmd_analyze(sub_args)
    elif subcommand == "plan":
        return cmd_plan(sub_args)
    else:
        print(f"Unknown subcommand: {subcommand}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

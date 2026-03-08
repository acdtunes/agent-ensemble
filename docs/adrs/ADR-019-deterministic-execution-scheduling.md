# ADR-019: Deterministic Execution Scheduling via next-steps CLI

## Status

Accepted

## Context

The `en:deliver` command orchestrates parallel feature delivery. A Lead (LLM session) must decide which roadmap steps to spawn next as crafters complete their work. The current `parallel_groups analyze` command computes all layers upfront, but the Lead still uses LLM judgment to determine when to spawn next-layer steps based on completion events.

LLM judgment for scheduling is unreliable: the Lead may forget which steps are complete, misjudge dependency satisfaction, or spawn steps whose dependencies are still in progress. Scheduling is a graph algorithm problem, not a reasoning problem.

## Decision

Add a `next-steps` CLI command to `en.cli.team_state` that deterministically computes which steps are ready to spawn. The Lead calls `next-steps` after each step completion and spawns exactly what it returns.

Algorithm:
1. Read all steps with their deps and current statuses from the roadmap
2. A step is READY when: status is `pending` AND all deps have status `approved`
3. For each ready step, detect file conflicts with currently active steps (status `in_progress` or `review`)
4. Output ready step IDs with conflict annotations (SHARED or WORKTREE)
5. Output DONE when no pending steps remain

The Lead MUST NOT use any other method to determine what to spawn. `next-steps` is the sole authority for execution ordering.

`parallel_groups analyze` remains as an optional preview/dry-run tool for the developer, but is NOT used to drive execution.

## Alternatives Considered

### Alternative 1: LLM-driven scheduling (current approach)

- **What**: Lead reads roadmap, reasons about dependencies, decides which steps to spawn
- **Expected Impact**: No code changes needed, relies on LLM capability
- **Why Insufficient**: LLMs lose track of state across long conversations. Dependency reasoning errors compound -- spawning a step before its deps are done causes cascading failures. Reproducibility is zero. The Lead prompt already grows with team management, adding scheduling reasoning increases failure probability.

### Alternative 2: Full execution plan upfront (current parallel_groups approach)

- **What**: Compute all layers upfront via `parallel_groups analyze`, execute layer by layer
- **Expected Impact**: Deterministic, simple mental model
- **Why Insufficient**: Prevents eager spawning. If layer 1 has 5 steps and step A unblocks a layer-2 step, that layer-2 step must wait for all 5 to complete. This wastes significant execution time. The "layer" abstraction is too coarse -- incremental scheduling is strictly better.

### Alternative 3: External scheduler service

- **What**: Run a persistent scheduler process that watches roadmap state and emits spawn events
- **Expected Impact**: Cleanest separation, event-driven
- **Why Insufficient**: Massive over-engineering for a single-developer project. Introduces a persistent process to manage, a communication protocol, and failure modes (scheduler crash). The CLI-based approach achieves the same determinism with zero infrastructure.

## Consequences

- **Positive**: Scheduling correctness guaranteed by algorithm. LLM cannot make ordering mistakes. Enables eager spawning (incremental, not layer-based). Fully reproducible -- same roadmap state always produces same next-steps output. Simple integration: Lead calls CLI, reads output, spawns.
- **Negative**: Requires the Lead to call `next-steps` after every step completion (one extra CLI call per step). Algorithm must be correct (but it is Kahn's algorithm, well-understood and testable).
- **Mitigation**: The CLI call cost is negligible (~100ms). Kahn's algorithm is already implemented and tested in `parallel_groups.py` -- `next-steps` reuses the same logic with status filtering.

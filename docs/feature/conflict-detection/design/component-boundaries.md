# Component Boundaries: Conflict Detection

## Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI LAYER                                   │
│  src/agent_ensemble/cli/team_state.py                                   │
│                                                                         │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │ _detect_file_       │    │ _get_conflicting_step_ids()         │    │
│  │ conflicts()         │───▶│ NEW: Returns step IDs, not files    │    │
│  │ (existing)          │    └─────────────────────────────────────┘    │
│  └─────────────────────┘                    │                          │
│                                             ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ cmd_start_step()                                                 │  │
│  │ - Calls _get_conflicting_step_ids()                              │  │
│  │ - Writes conflicts_with to starting step                         │  │
│  │ - Updates conflicts_with on all conflicting steps (mutual)       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ cmd_complete_step()                                              │  │
│  │ - Clears conflicts_with from completed step                      │  │
│  │ - Removes step ID from other steps' conflicts_with               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ writes
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           roadmap.yaml                                   │
│  steps:                                                                 │
│    - id: "1.1"                                                          │
│      worktree: "/path/..."        # existing                            │
│      conflicts_with: ["2.1"]      # NEW                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ read by
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BOARD SERVER                                   │
│  board/server/parser.ts                                                 │
│                                                                         │
│  - Parses roadmap.yaml                                                  │
│  - Passes through worktree, conflicts_with fields (no transformation)  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BOARD UI                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ board/shared/types.ts                                            │  │
│  │ RoadmapStep { worktree?: string; conflicts_with?: string[] }     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ board/src/utils/statusMapping.ts                                 │  │
│  │ expandStepToStepCard(): StepCardData                             │  │
│  │ - worktree: Boolean(step.worktree)                               │  │
│  │ - conflictsWith: step.conflicts_with ?? []                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ board/src/components/StepCard.tsx                                │  │
│  │ - Displays worktree badge (existing, now wired up)               │  │
│  │ - Displays conflicts badge: "conflicts: N"                       │  │
│  │ - Tooltip on hover: "Conflicts with: X, Y, Z"                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Responsibility Matrix

| Component | Responsibility | Does NOT do |
|-----------|----------------|-------------|
| `team_state.py` | Compute conflicts, write to YAML | Display logic |
| `roadmap.yaml` | Persist conflict state | Computation |
| `parser.ts` | Parse and pass through | Transform conflict data |
| `types.ts` | Define shape | Business logic |
| `statusMapping.ts` | Map to display model | Conflict computation |
| `StepCard.tsx` | Render badges | State management |

## Pure Function Boundaries

All new functions are pure (no side effects except final YAML write):

```python
# CLI - Pure functions
def _get_conflicting_step_ids(step: dict, active_steps: list[dict]) -> list[str]:
    """Returns list of step IDs that conflict (share files)."""
    pass  # Pure: dict in, list out

def _add_conflict_to_step(step: dict, conflict_id: str) -> dict:
    """Returns step with conflict_id added to conflicts_with."""
    pass  # Pure: returns new dict

def _remove_conflict_from_step(step: dict, conflict_id: str) -> dict:
    """Returns step with conflict_id removed from conflicts_with."""
    pass  # Pure: returns new dict
```

```typescript
// Board - Pure functions
const expandStepToStepCard = (step: RoadmapStep, isBlocked: boolean): StepCardData => {
  // Pure: RoadmapStep in, StepCardData out
};
```

## Dependency Inversion

The board depends on **abstractions** (TypeScript interfaces), not the CLI implementation:

```
CLI (concrete) ──writes──▶ roadmap.yaml (data) ◀──reads── Board (abstracts via RoadmapStep interface)
```

The board doesn't know or care how `conflicts_with` is computed — it just reads the field.

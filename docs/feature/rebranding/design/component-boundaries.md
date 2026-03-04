# Component Boundaries — Rebranding to Agent Ensemble

## Unchanged Architecture

The rebranding does not alter component boundaries. The system remains:

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Ensemble                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ CLI Commands  │  │   Python     │  │  Web Dashboard   │  │
│  │              │  │   Package    │  │                  │  │
│  │ 9 .md files  │→→│ agent_       │  │ React 19 + Vite  │  │
│  │ /agent-      │  │ ensemble/    │  │ "Agent Ensemble" │  │
│  │ ensemble:*   │  │ cli/         │  │                  │  │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘  │
│                           │                    │            │
│                           ▼                    ▼            │
│                    ┌──────────────┐  ┌──────────────────┐  │
│                    │ File System  │  │  Board Server    │  │
│                    │ .agent-      │  │  Express + WS    │  │
│                    │ ensemble/    │  │  :3001 / :3002   │  │
│                    │ state.yaml   │  │                  │  │
│                    │ plan.yaml    │  │                  │  │
│                    └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Rename Impact per Component

| Component | Files Touched | Risk Level | Notes |
|-----------|--------------|------------|-------|
| Python Package | ~6 source + pyproject.toml | Medium | Directory rename + import paths |
| CLI Commands | 9 command .md files | Low | Text substitution only |
| Web Dashboard | 4 UI files + package.json | Low | Display text changes |
| Board Server | 0 source files | None | No hardcoded old-name refs |
| Install Script | 1 file | Medium | Path changes + migration logic |
| Tests (Python) | ~3 files | Low | Import path updates |
| Tests (Board) | ~25 files | Low | Mostly cosmetic path strings |
| Documentation | ~40+ files | Low | Bulk text substitution |

## Dependency Graph for Rename

```
                     ┌──────────────────────┐
                     │ Phase 1: Python Pkg  │
                     │ (src/agent_ensemble) │
                     └──────────┬───────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Phase 2: │ │ Phase 3: │ │ Phase 4: │
            │ CLI Cmds │ │ Web UI   │ │ Install  │
            └──────────┘ └──────────┘ └──────────┘
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                     ┌──────────────────────┐
                     │ Phase 5: Docs        │
                     └──────────────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Phase 6: Verification│
                     └──────────────────────┘
```

Phase 1 must complete first (Python module is referenced by CLI commands).
Phases 2, 3, 4 can execute in parallel.
Phase 5 follows all code changes.
Phase 6 is the final verification sweep.

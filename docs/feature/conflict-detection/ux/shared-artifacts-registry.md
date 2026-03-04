# Shared Artifacts Registry: Conflict Detection

## Purpose

This registry documents where conflict data originates and flows through the system.

## Data Flow

```
┌─────────────────────────────────────┐
│  CLI: start-step                    │
│  (detects conflicts, writes YAML)   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  roadmap.yaml                       │
│  - worktree: "/path/to/worktree"    │
│  - conflicts_with: ["1.2", "2.1"]   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Board Server (parser.ts)           │
│  (passes through fields)            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  WebSocket → Board UI               │
│  (RoadmapStep with new fields)      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  StepCard                           │
│  (displays badges from props)       │
└─────────────────────────────────────┘
```

## Single Source of Truth

| Artifact | Source | Consumers |
|----------|--------|-----------|
| `worktree` | CLI `start-step` writes to YAML | StepCard badge |
| `conflicts_with` | CLI `start-step` writes to YAML | StepCard badge, tooltip |

## Key Principle

**No client-side conflict computation.** The CLI already does this work — the board just reads and displays.

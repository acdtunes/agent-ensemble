# EN Consolidation -- Test Scenarios

## Scenario Inventory

### Walking Skeletons (3)

| ID | Scenario | User Stories |
|----|----------|-------------|
| WS-01 | Developer syncs upstream and gets working en: commands | US-01, US-03, US-07 |
| WS-02 | Developer delivers a feature using parallel team execution | US-05, US-05b |
| WS-03 | Developer resumes interrupted delivery without losing progress | US-05 |
| WS-04 | Developer clones repo and runs install to get a working setup | US-08 |

### Milestone 1: Vendor Setup (5 scenarios)

| ID | Scenario | Type | User Story |
|----|----------|------|------------|
| M1-01 | Vendor directory is populated from upstream | Happy | US-01 |
| M1-02 | Vendor files are identical to upstream source | Happy | US-01 |
| M1-03 | Vendor directory is tracked in version control | Happy | US-01 |
| M1-04 | Vendor population fails when upstream is unavailable | Error | US-01 |
| M1-05 | Vendor directory is never edited manually | Edge | US-01 |

### Milestone 2: Package Rename (8 scenarios)

| ID | Scenario | Type | User Story |
|----|----------|------|------------|
| M2-01 | Package directory is renamed | Happy | US-02 |
| M2-02 | CLI modules are accessible under new package name | Happy | US-02 |
| M2-03 | Internal imports use the new package name | Happy | US-02 |
| M2-04 | Editable install reflects new package name | Happy | US-02 |
| M2-05 | Dependency direction is always en depends on des, never reverse | Property | US-02 |
| M2-06 | Rename fails gracefully if target already exists | Error | US-02 |
| M2-07 | Old ensemble commands are removed after rename | Happy | US-04 |
| M2-08 | All legacy ensemble command files are removed | Happy | US-04 |

### Milestone 3: Sync Generation (16 scenarios)

| ID | Scenario | Type | User Story |
|----|----------|------|------------|
| M3-01 | Commands are generated with en: prefix | Happy | US-03 |
| M3-02 | Command content references en- agents | Happy | US-03 |
| M3-03 | Command skill paths point to local skills | Happy | US-03 |
| M3-04 | Command PYTHONPATH uses project src/ | Happy | US-06 |
| M3-05 | deliver.md is preserved as project override | Edge | US-03 |
| M3-06 | Agent files are renamed from nw- to en- | Happy | US-03b |
| M3-07 | Agent content references use en- naming | Happy | US-03b |
| M3-08 | Agent model uses explicit model identifier | Happy | US-03b |
| M3-09 | Agent skill paths point to local skills | Happy | US-03b |
| M3-10 | Skills directory mirrors upstream structure | Happy | US-03c |
| M3-11 | No global skill references in generated files | Property | US-03c |
| M3-12 | All CLI invocations use local PYTHONPATH | Happy | US-06 |
| M3-13 | No global installation references anywhere | Property | US-06 |
| M3-14 | Sync script performs all transformations | Happy | US-07 |
| M3-15 | Sync script is idempotent | Property | US-07 |
| M3-16 | Sync script supports dry run | Happy | US-07 |
| M3-17 | Sync script fails when vendor directory is missing | Error | US-07 |
| M3-18 | Sync script skips delivery override | Edge | US-07 |
| M3-19 | Sync script handles missing upstream directories | Error | US-07 |
| M3-20 | Sync script writes nwave/VERSION with upstream tag and commit | Happy | US-07 |
| M3-21 | nwave/VERSION is updated on each sync | Happy | US-07 |

### Milestone 4: Deliver Rewrite (20 scenarios)

| ID | Scenario | Type | User Story |
|----|----------|------|------------|
| M4-01 | Next-steps returns steps with all deps satisfied | Happy | US-05b |
| M4-02 | Next-steps returns newly unblocked steps | Happy | US-05b |
| M4-03 | Next-steps excludes steps in progress | Edge | US-05b |
| M4-04 | Next-steps excludes steps in review | Edge | US-05b |
| M4-05 | Next-steps reports done when all approved | Happy | US-05b |
| M4-06 | Next-steps detects file conflicts | Happy | US-05b |
| M4-07 | Next-steps only counts approved as satisfied | Edge | US-05b |
| M4-08 | Next-steps output is deterministic | Property | US-05b |
| M4-09 | Next-steps uses machine-parseable format | Happy | US-05b |
| M4-10 | Next-steps marks shared isolation | Happy | US-05b |
| M4-11 | Next-steps marks worktree isolation | Happy | US-05b |
| M4-12 | Delivery creates roadmap when none exists | Happy | US-05 |
| M4-13 | Delivery skips roadmap when valid exists | Happy | US-05 |
| M4-14 | Delivery initializes TDD tracking | Happy | US-05 |
| M4-15 | Delivery loop continues until done | Happy | US-05 |
| M4-16 | Delivery verifies TDD compliance | Happy | US-05 |
| M4-17 | Steps with file conflicts use worktree | Happy | US-05 |
| M4-18 | Completed worktree is merged back | Happy | US-05 |
| M4-19 | Step with failed dependency never scheduled | Error | US-05b |
| M4-20 | Merge conflict is escalated | Error | US-05 |
| M4-21 | Delivery can be resumed after interruption | Error | US-05 |
| M4-22 | Crafter spawned fresh per step | Edge | US-05 |
| M4-23 | Single-step roadmap completes in one iteration | Edge | US-05b |
| M4-24 | All steps depend on single bottleneck | Edge | US-05b |
| M4-25 | Scheduling never produces cycles | Property | US-05b |

### Milestone 5: Install Script (10 scenarios)

| ID | Scenario | Type | User Story |
|----|----------|------|------------|
| M5-01 | Install script installs Python dependencies via uv | Happy | US-08 |
| M5-02 | Install script falls back to pip when uv is unavailable | Happy | US-08 |
| M5-03 | Install script fails when no Python package manager found | Error | US-08 |
| M5-04 | Install script creates Claude Code settings from scratch | Happy | US-08 |
| M5-05 | Install script merges into existing Claude Code settings | Edge | US-08 |
| M5-06 | Install script skips settings when already configured | Edge | US-08 |
| M5-07 | Install script cleans up old global installations | Happy | US-08 |
| M5-08 | Install script installs board UI dependencies | Happy | US-08 |
| M5-09 | Install script warns when npm is unavailable | Edge | US-08 |
| M5-10 | Install script is idempotent | Property | US-08 |

## Coverage Summary

| Category | Count | Percentage |
|----------|-------|------------|
| Happy path | 33 | 51% |
| Error path | 9 | 14% |
| Edge case | 13 | 20% |
| Property | 7 | 11% |
| Walking skeleton | 4 | 6% |
| **Total** | **62** (walking skeletons counted separately) | |

Error + Edge + Property combined: 29 out of 62 (47%). Exceeds 40% threshold. Property-based tests cover universal invariants that subsume many individual error cases (e.g., "no global references anywhere" covers all path-related errors, "install is idempotent" covers duplicate-entry errors).

## User Story Coverage

| User Story | Scenarios | Covered |
|------------|-----------|---------|
| US-01 | M1-01 to M1-05, WS-01 | Yes |
| US-02 | M2-01 to M2-06 | Yes |
| US-03 | M3-01 to M3-05, WS-01 | Yes |
| US-03b | M3-06 to M3-09 | Yes |
| US-03c | M3-10, M3-11 | Yes |
| US-04 | M2-07, M2-08 | Yes |
| US-05 | M4-12 to M4-22, WS-02, WS-03 | Yes |
| US-05b | M4-01 to M4-11, M4-19, M4-23 to M4-25 | Yes |
| US-06 | M3-04, M3-12, M3-13 | Yes |
| US-07 | M3-14 to M3-21, WS-01 | Yes |
| US-08 | M5-01 to M5-10, WS-04 | Yes |

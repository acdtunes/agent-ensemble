# Epic: Review History Persistence

## Problem Statement

The nw-teams execution system's CLI commands (`transition` and `complete-step`) do not persist reviewer feedback to roadmap.yaml. Reviewer feedback (outcome and text) exists only as ephemeral messages in the Lead agent's conversation. The board UI's StepDetailModal already renders `review_history` entries when present, but no data is ever written. The entire consumer pipeline (TypeScript types, YAML parser, React UI) is ready -- only the producer (Python CLI) is missing.

## Job Story

When a reviewer approves or rejects a step during parallel execution,
I want the review outcome and feedback text to be persisted in roadmap.yaml as structured review_history entries,
so I can see what happened during each review cycle from the board UI without digging through conversation logs.

## Stories

| ID | Title | Type | Effort | Scenarios | Dependencies |
|----|-------|------|--------|-----------|--------------|
| US-01 | Persist Review Feedback on Step Transition | User Story | 1-2 days | 5 | None |
| US-02 | Persist Review Feedback on Step Completion | User Story | 1-2 days | 5 | US-01 (shared logic) |
| TT-01 | Update execute.md Review Flags | Technical Task | <1 day | N/A | US-01, US-02 |

## Execution Order

1. **US-01** (transition) -- foundational, introduces VALID_OUTCOMES constant and review_history entry creation helper
2. **US-02** (complete-step) -- reuses helper from US-01, adds to second command
3. **TT-01** (execute.md) -- documentation update to activate the feature in Lead prompts

US-01 and US-02 can be developed in parallel if the shared helper interface is agreed upon first.

## Data Pipeline (End-to-End)

```
Reviewer verdict      Lead CLI call       roadmap.yaml          parser.ts            StepDetailModal
(message)         --> (transition/        (review_history    --> (validateReview   --> (renders entries
                      complete-step         entries written)      History)              newest-first)
                      --outcome --feedback)

     [US-01/US-02]         ^                    ^                  [existing]           [existing]
                           |                    |
                      [TT-01 enables            |
                       Lead to pass flags]      |
                                          [ruamel.yaml
                                           roundtrip]
```

## Shared Artifacts

See `/docs/ux/review-history-persistence/shared-artifacts-registry.md` for full registry.

Key integration constraint: CLI must write outcome values matching parser.ts `REVIEW_OUTCOMES` set (`"approved"`, `"rejected"`).

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| YAML roundtrip breaks formatting | Low | Medium | ruamel.yaml already used for roundtrip; add test with formatted YAML |
| execute.md changes not picked up by Lead | Low | High | TT-01 explicitly updates all relevant sections |
| review_attempts / cycle number mismatch | Medium | Low | Document cycle derivation clearly; review_attempts incremented on transition --status review, not on recording |

## MoSCoW

- **Must Have**: US-01, US-02 (without these, the board UI has no review data)
- **Must Have**: TT-01 (without this, the Lead never passes the flags)
- **Won't Have (this epic)**: Migrating existing review_attempts-only steps to review_history (legacy data stays as-is, UI falls back gracefully)

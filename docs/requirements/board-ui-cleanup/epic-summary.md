# Epic: Board UI Cleanup

## Business Context

The nw-teams board is a monitoring tool for multi-agent software delivery. The project owner (Andres) uses it to track AI agent progress across multiple features. The current board has accumulated UI elements that add noise without supporting decision-making: an activity feed showing raw transitions, idle teammates in the sidebar, review count badges on cards without context, and no access to actual review feedback.

This epic addresses four related cleanup and improvement jobs to make the board a focused, noise-free monitoring tool.

## Stories

| ID | Title | Priority | Effort | Scenarios | Dependencies |
|----|-------|----------|--------|-----------|-------------|
| US-01 | Remove Activity Section | Must Have | ~1 day | 3 | None |
| US-02 | Active-Only Teammates Panel | Must Have | ~1 day | 5 | None |
| US-03 | Clean Done Card Appearance | Should Have | <1 day | 4 | None |
| US-04 | Remove Review Badge from Cards | Must Have | <1 day | 3 | None |
| US-05 | Review History in Step Detail Modal | Should Have | 2-3 days | 5 | Schema evolution for review_history |
| US-06 | Discover Features from All Doc Directories | Must Have | <1 day | 5 | None |

**Total**: 6 stories, 25 scenarios, estimated 6-8 days effort

## Recommended Execution Order

```
US-06 (Feature Discovery) --------> First: unblocks seeing the feature on the board
US-01 (Remove Activity)  ----\
US-02 (Active Teammates) -----+--> Can be done in parallel (no dependencies)
US-04 (Remove Review Badge) -/
US-03 (Clean Done Cards) ---------> Independent, low effort
US-05 (Review History) -----------> Last: depends on schema design
```

US-01, US-02, and US-04 are independent "Must Have" removals that can be executed in parallel. US-03 is a small refinement. US-05 requires schema evolution and should be preceded by a technical task to design the review_history data structure.

## JTBD-to-Story Mapping

| Job | Story | Relationship |
|-----|-------|-------------|
| J1: Declutter sidebar | US-01 | 1:1 |
| J2: See only active teammates | US-02 | 1:1 |
| J3: Clean up done cards | US-03 | 1:1 |
| J4: Review insight (card cleanup) | US-04 | N:1 (J4 -> US-04 + US-05) |
| J4: Review insight (modal history) | US-05 | N:1 (J4 -> US-04 + US-05) |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| US-03 may already be existing behavior | Medium | Low | Verify with test before implementing |
| US-05 schema design blocks implementation | Medium | Medium | Create a spike/technical task for schema design first |
| Review feedback source undefined | Medium | High | Define where reviewer feedback gets written before US-05 |

## Artifacts

### UX Artifacts (docs/ux/board-ui-cleanup/)
- `jtbd-analysis.md` -- Jobs-to-be-Done analysis with Four Forces and Opportunity Scoring
- `journey-board-cleanup-visual.md` -- Visual journey with ASCII mockups
- `journey-board-cleanup.yaml` -- Structured journey schema
- `journey-board-cleanup.feature` -- Gherkin scenarios (20 total)
- `shared-artifacts-registry.md` -- Shared artifact tracking and integration validation

### Requirements (docs/requirements/board-ui-cleanup/)
- `epic-summary.md` -- This document
- `US-01-remove-activity-section.md` -- User story with DoR PASSED
- `US-02-active-only-teammates.md` -- User story with DoR PASSED
- `US-03-clean-done-card-appearance.md` -- User story with DoR PASSED
- `US-04-remove-review-badge.md` -- User story with DoR PASSED
- `US-05-review-history-in-modal.md` -- User story with DoR PASSED
- `US-06-discover-features-from-all-doc-dirs.md` -- User story with DoR PASSED

## DoR Summary

All 5 stories pass the 8-item Definition of Ready:

| Story | Problem | Persona | Examples | UAT | AC | Size | Tech Notes | Deps |
|-------|---------|---------|----------|-----|-----|------|-----------|------|
| US-01 | PASS | PASS | PASS (3) | PASS (3) | PASS (4) | PASS | PASS | PASS |
| US-02 | PASS | PASS | PASS (4) | PASS (5) | PASS (5) | PASS | PASS | PASS |
| US-03 | PASS | PASS | PASS (3) | PASS (4) | PASS (4) | PASS | PASS | PASS |
| US-04 | PASS | PASS | PASS (3) | PASS (3) | PASS (4) | PASS | PASS | PASS |
| US-05 | PASS | PASS | PASS (4) | PASS (5) | PASS (6) | PASS | PASS | PASS |

## Handoff Status

**Ready for DESIGN wave** (solution-architect).

All stories are solution-neutral -- they describe observable user outcomes without prescribing implementation. The DESIGN wave will determine:
- Whether to delete or archive the ActivityFeed component
- How to structure the review_history data in the roadmap schema
- Whether the transitions prop should be cleaned up from BoardContent
- Optimal rendering approach for review history in the modal

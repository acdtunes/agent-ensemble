# Epic: Features Page Redesign

## Business Context

The features overview page is the primary entry point for assessing project health across multiple features. For projects with 10+ features, the current page fails to help users quickly locate specific features or understand status distribution. This redesign addresses four specific pain points: a confusing status label, low card density, unpredictable ordering, and no search/filter capabilities.

## Job Statement

"Help me quickly find and assess the status of specific features across a multi-feature project so I can prioritize my work effectively."

## Stories

| ID | Title | Priority | Effort | Dependencies | Scenarios |
|----|-------|----------|--------|--------------|-----------|
| US-1 | Remove "Docs only" tag | Must Have | 0.5d | None | 4 |
| US-2 | Narrower card width | Must Have | 0.5d | None | 4 |
| US-3 | Status-grouped + alphabetical ordering | Must Have | 1d | US-1 | 5 |
| US-4 | Search by feature name | Should Have | 1d | US-3 | 6 |
| US-5 | Filter by status | Should Have | 1d | US-3, US-4 | 6 |

**Total**: ~4 days effort, 25 UAT scenarios

## Dependency Graph

```
US-1 (Remove "Docs only")  ----+
                                |
                                v
US-2 (Narrower cards)       US-3 (Status grouping + ordering)
   [independent]                |
                                +-----> US-4 (Search by name)
                                |           |
                                +-----------+---> US-5 (Filter by status)
```

**Recommended execution order**: US-1 -> US-2 (parallel with US-1) -> US-3 -> US-4 -> US-5

US-1 and US-2 can be executed in parallel since they have no interdependencies. US-3 depends on US-1 for consistent classification (no "docs-only" state). US-4 depends on US-3 for group header behavior. US-5 depends on both US-3 and US-4 for filter composition.

## Personas

- **Elena Ruiz**: Project maintainer managing 18 features across "acme-platform". Uses the features page daily during standups and weekly during sprint planning. Works on a 1440px desktop monitor.
- **Carlos Mendez**: Junior developer on the team, uses a 13-inch laptop (1024px viewport). Manages a smaller project "new-initiative" with 5 features.

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Narrower cards truncate long feature names | Low | Medium | Test with longest real feature name; add text truncation with tooltip |
| Status grouping changes user's muscle memory for card positions | Low | Low | Alphabetical ordering within groups provides predictability |
| Search+filter composition logic becomes complex | Low | Medium | Keep filter chain simple: search first, then status filter, then group |

## Non-Functional Requirements

- **Performance**: Filtering and sorting must complete in <50ms for up to 100 features (client-side)
- **Accessibility**: Search input must have associated label; filter buttons must be keyboard-navigable
- **Responsiveness**: Layout must adapt gracefully from 375px to 1920px viewport widths

## Artifacts

### UX Artifacts (`docs/ux/features-page-redesign/`)
- `jtbd-analysis.md` -- JTBD analysis with forces and job map
- `journey-features-overview-visual.md` -- Journey flow + UI mockup
- `journey-features-overview.yaml` -- Structured journey schema
- `journey-features-overview.feature` -- Gherkin scenarios (all stories)
- `shared-artifacts-registry.md` -- Shared data tracking

### Requirements (`docs/requirements/features-page-redesign/`)
- `epic-summary.md` -- This file
- `US-1-remove-docs-only-tag.md`
- `US-2-narrower-card-width.md`
- `US-3-status-grouped-alphabetical-ordering.md`
- `US-4-search-by-feature-name.md`
- `US-5-filter-by-status.md`

## DoR Summary

All 5 stories have passed the Definition of Ready validation with 8/8 items:

| Story | DoR Status |
|-------|-----------|
| US-1 | PASSED |
| US-2 | PASSED |
| US-3 | PASSED |
| US-4 | PASSED |
| US-5 | PASSED |

## Handoff Notes for DESIGN Wave

- All stories are solution-neutral -- they describe observable outcomes, not implementation details
- Technical notes in each story identify affected files but do not prescribe solutions
- The `classifyFeatureDisplayState` pure function is the key integration point -- sorting and filtering must use the same classification
- No backend changes are anticipated; all changes are client-side (React components + pure functions)
- The existing `FeatureSummary` type provides all data needed; no type changes required

# Multi-Project Selector -- Test Scenarios

## Scenario Inventory

| Milestone | Feature File | US | Scenarios | Error % | Walking Skeletons |
|-----------|-------------|-----|-----------|---------|-------------------|
| - | walking-skeleton.feature | All | 4 | 0% | 4 |
| 1 | milestone-1-types-and-manifest.feature | US-01, US-02 | 13 | 31% | 0 |
| 2 | milestone-2-feature-discovery.feature | US-02 | 8 | 13% | 0 |
| 3 | milestone-3-route-parsing.feature | US-04, US-05, US-06 | 9 | 22% | 0 |
| 4 | milestone-4-feature-cards.feature | US-03, US-04 | 11 | 9% | 0 |
| 5 | milestone-5-feature-board.feature | US-05 | 8 | 13% | 0 |
| 6 | milestone-6-feature-docs.feature | US-06 | 8 | 13% | 0 |
| **Total** | | | **61** | | **4** |

## Error Path / Edge Case Analysis

Total scenarios: 61
Error/edge/boundary scenarios: 25 (41%)
Property-shaped scenarios: 5 (8%)

### Error scenarios by user story

| US | Error/Edge Scenarios |
|----|---------------------|
| US-01 | Invalid path rejected, duplicate rejected, empty state guidance, malformed manifest, missing manifest, add-then-remove roundtrip, feature ID validation |
| US-02 | Empty feature directory, docs-only feature, no roadmap + no log, metric invariant |
| US-03 | Parse error diagnostic, empty project |
| US-04 | Unrecognized hash fallback, incomplete feature route, route never throws |
| US-05 | No execution state (all queued), roadmap parse error, board-only dropdown filter |
| US-06 | No documentation empty state |

## User Story Coverage Matrix

| User Story | Scenarios | Walking Skeleton | Happy | Error | Boundary | Property |
|-----------|-----------|------------------|-------|-------|----------|----------|
| US-01 | 9 | WS-1 | 2 | 4 | 1 | 2 |
| US-02 | 12 | WS-1 | 3 | 2 | 2 | 1 |
| US-03 | 5 | WS-1 | 2 | 1 | 1 | 0 |
| US-04 | 12 | WS-2, WS-4 | 3 | 3 | 1 | 1 |
| US-05 | 12 | WS-2, WS-4 | 2 | 2 | 3 | 0 |
| US-06 | 11 | WS-3, WS-4 | 3 | 1 | 2 | 0 |

## Driving Ports by Milestone

| Milestone | Driving Ports |
|-----------|--------------|
| 1 | validateManifest, addEntry, removeEntry, findDuplicate, createFeatureId, resolveFeatureDir, resolveFeatureRoadmap, resolveFeatureExecutionLog, resolveFeatureDocsRoot |
| 2 | deriveFeatureSummary, isFeatureDir, discoverFeatures (via HTTP) |
| 3 | parseHash (extended) |
| 4 | ProjectCard props (extended), FeatureCard props, ProjectFeatureView props |
| 5 | useFeatureState hook, ContextDropdowns props, FeatureBoardView props |
| 6 | useDocTree (feature-scoped), useDocContent (feature-scoped), ContextDropdowns props, FeatureDocsView props |

## Implementation Sequence

One scenario at a time. Enable the first (non-skip) scenario in each milestone, implement until green, then enable the next.

### Milestone 1 (Foundation)
1. US-01: Register a project by providing its folder path
2. US-01: Remove a project from the board
3. US-01: Invalid path shows validation error
4. US-01: Adding a duplicate project is rejected
5. US-01: Empty state shows onboarding guidance
6. US-02: Feature directory resolves from project path
7. US-02: Feature roadmap path resolves correctly
8. US-02: Feature execution log path resolves correctly
9. US-02: Feature docs root resolves correctly
10. US-01: Malformed manifest file is rejected
11. US-01: Missing manifest creates empty on first use
12. US-01: Add-then-remove roundtrip (property)
13. US-01: Feature ID validation (property)

### Milestone 2 (Feature Discovery)
1. US-02: Features discovered from project filesystem
2. US-02: Feature with roadmap reports board availability
3. US-02: Feature without roadmap is docs-only
4. US-02: Project without feature directory returns empty
5. US-02: Feature with execution progress reports metrics
6. US-02: Feature with roadmap but no execution log
7. US-02: Feature with no roadmap and no execution log
8. US-02: Feature summary metrics invariant (property)

### Milestone 3 (Route Parsing)
1. US-04: Project view route parsed from URL
2. US-05: Feature board route parsed from URL
3. US-06: Feature docs route parsed from URL
4. US-04: Overview from empty hash
5. US-04: Legacy board route
6. US-04: Legacy docs route
7. US-04: Unrecognized hash fallback
8. US-05: Incomplete feature route fallback
9. US-04: Route parsing never throws (property)

### Milestone 4 (Feature Cards)
1. US-03: Project card shows feature count
2. US-03: Card shows aggregated feature status
3. US-03: Parse error shows diagnostic
4. US-03: Empty project shows graceful state
5. US-03: Card click navigates to feature view
6. US-04: Feature view shows all features
7. US-04: Feature card with progress shows metrics
8. US-04: Feature with roadmap shows Board link
9. US-04: Feature without roadmap shows Docs-only
10. US-04: Feature not started shows planned state
11. US-04: Feature view breadcrumb shows context

### Milestone 5 (Feature Board)
1. US-05: Feature board loads delivery data
2. US-05: Feature without execution state shows all queued
3. US-05: Board breadcrumb shows full hierarchy
4. US-05: Board-to-Docs tab switching
5. US-05: Switch feature from board via dropdown
6. US-05: Switch project from board via dropdown
7. US-05: Feature dropdown only shows board-capable features
8. US-05: Roadmap parse error shows diagnostic

### Milestone 6 (Feature Docs)
1. US-06: Feature docs tree scoped to feature directory
2. US-06: Document content renders from feature path
3. US-06: Copy path copies project-relative path
4. US-06: Feature with no documentation shows empty state
5. US-06: Board-Docs tab switching preserves context
6. US-06: Switch feature from docs via dropdown
7. US-06: Switch project from docs via dropdown
8. US-06: Feature dropdown lists all features including docs-only

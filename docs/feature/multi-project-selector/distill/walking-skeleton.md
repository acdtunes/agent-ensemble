# Multi-Project Selector -- Walking Skeleton Strategy

## Walking Skeletons (4 total)

Each skeleton answers: "Can Andres accomplish this goal and see the result?"

### WS-1: Register and discover features
**User goal**: Andres registers a project and sees its features on the dashboard.
**Observable value**: Project appears with feature count, feature cards show progress.
**Vertical slice**: Manifest store -> Feature discovery -> Project card -> Feature card grid.
**User stories covered**: US-01 (register), US-02 (discover), US-03 (overview card).

### WS-2: Navigate to feature board
**User goal**: Andres drills from overview to a feature board and sees delivery state.
**Observable value**: Board shows steps in status columns, breadcrumb provides orientation.
**Vertical slice**: Route parsing -> Feature state fetch -> Board render with context dropdowns.
**User stories covered**: US-04 (feature view), US-05 (feature board).

### WS-3: Browse feature-scoped docs
**User goal**: Andres browses documentation scoped to a single feature.
**Observable value**: Doc tree shows only feature files, content renders in panel.
**Vertical slice**: Route parsing -> Feature docs root -> Scoped doc tree -> Content rendering.
**User stories covered**: US-06 (feature docs).

### WS-4: Switch context without navigating back
**User goal**: Andres switches features and projects via dropdowns without back-navigation.
**Observable value**: Board/docs update to new selection, breadcrumb reflects change.
**Vertical slice**: Context dropdowns -> Route navigation -> View update.
**User stories covered**: US-05 (feature board switching), US-06 (feature docs switching).

## Focused Scenario Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| Walking skeletons | 4 | 7% |
| Happy path (focused) | 18 | 30% |
| Error path (focused) | 13 | 21% |
| Edge/boundary (focused) | 11 | 18% |
| Property-shaped | 5 | 8% |
| Context switching | 10 | 16% |
| **Total** | **61** | **100%** |

## Skeleton Litmus Test

| Criterion | WS-1 | WS-2 | WS-3 | WS-4 |
|-----------|------|------|------|------|
| Title describes user goal | Register + see features | Navigate to feature board | Browse feature docs | Switch without back-nav |
| Given/When: user actions | Registers, clicks | Navigates, views | Navigates, clicks doc | Selects dropdown |
| Then: user observations | Sees project + features | Sees board + breadcrumb | Sees doc tree + content | Sees updated view |
| Stakeholder confirmable | Yes | Yes | Yes | Yes |
| Zero technical terms | Yes | Yes | Yes | Yes |

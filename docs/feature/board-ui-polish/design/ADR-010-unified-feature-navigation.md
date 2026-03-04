# ADR-010: Unified Feature Navigation Pattern

## Status
Proposed

## Context

Feature-level routes have three different navigation implementations:

1. **Feature Board route**: `FeatureNavHeader` (breadcrumb + Board/Docs tabs) rendered in `PageShell` sticky header via `headerContent` prop
2. **Feature Docs route**: Plain `<h1>NW Teams Board</h1>` in `PageShell` header; breadcrumb + Board/Docs tabs rendered inside `FeatureDocsView` content area (scrolls with page)
3. **Project Docs route**: `ProjectTabs` in `PageShell` header provides Board/Docs tabs, but `DocViewer` also renders its own Board/Docs nav when `onNavigateToBoard` is provided (double navigation)

This creates visual inconsistency: navigating between Board and Docs for the same feature shows different header layouts. The docs route lacks a sticky breadcrumb, and the project docs route shows duplicate navigation controls.

## Decision

Unify all feature-level navigation into the `PageShell` sticky header using the existing `FeatureNavHeader` component pattern:

- **Feature Board route**: No change (already correct)
- **Feature Docs route**: Use `FeatureNavHeader` with `activeTab="docs"` in `PageShell` header. Remove breadcrumb and Board/Docs tabs from `FeatureDocsView` content area
- **Project Docs route**: Remove `onNavigateToBoard` from `DocViewer` to eliminate duplicate nav. `ProjectTabs` in header already provides Board/Docs tabs
- **DocViewer**: Becomes a pure document display component with no navigation responsibility

## Alternatives Considered

### Alternative 1: Move all nav into content area
- **What**: Remove nav from `PageShell` header; render breadcrumb+tabs at top of each content component
- **Expected Impact**: 100% consistency
- **Why Rejected**: Loses sticky header benefit -- breadcrumb scrolls off-screen on long pages. Feature Board already has it in the header and that pattern works well

### Alternative 2: Create a new unified NavBar component
- **What**: New component abstracting all nav variations (project-level, feature-level)
- **Expected Impact**: 100% consistency with reuse
- **Why Rejected**: Over-engineering. `FeatureNavHeader` and `ProjectTabs` already exist and work. Only the docs route wiring is wrong, not the components themselves. Adding abstraction for 2 variants (project/feature) adds complexity without clear payoff

## Consequences

### Positive
- Consistent sticky breadcrumb+tabs on all feature routes
- DocViewer has single responsibility (display docs, no navigation)
- No duplicate Board/Docs navigation on project docs route
- Zero new components -- reuses existing `FeatureNavHeader`

### Negative
- `FeatureDocsView` needs additional props passed down from route level (already available in `FeatureDocsRouteView`)
- `FeatureDocsView` loses self-contained navigation (depends on parent for header)

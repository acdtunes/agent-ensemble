# Board UI Polish -- Architecture Document

## System Context

This feature modifies the existing NW Teams Board frontend application. No new systems, services, or external integrations are introduced. All changes are within the React component layer of the single-page application.

### C4 System Context (L1)

```mermaid
C4Context
    title Board UI Polish - System Context

    Person(user, "Developer", "Views project/feature boards")
    System(board, "NW Teams Board", "React SPA displaying project roadmaps and docs")
    System_Ext(server, "NW Teams Server", "Serves roadmap data via WebSocket + REST")

    Rel(user, board, "Browses projects, features, boards, docs")
    Rel(board, server, "Fetches roadmap/doc data via WS + HTTP")
```

No context-level changes. All modifications are internal to the Board SPA container.

### C4 Container (L2)

```mermaid
C4Container
    title Board UI Polish - Container Diagram

    Person(user, "Developer")

    Container_Boundary(spa, "NW Teams Board SPA") {
        Component(shell, "PageShell", "Layout wrapper with sticky header")
        Component(nav, "Navigation Header", "Breadcrumb + Board/Docs tabs (UNIFIED)")
        Component(overview, "OverviewDashboard", "Project grid + Add Project")
        Component(projectView, "ProjectFeatureView", "Feature grid for a project")
        Component(featureBoard, "FeatureBoardView", "Kanban board content")
        Component(featureDocs, "FeatureDocsView", "Doc tree + content viewer")
        Component(docViewer, "DocViewer", "Doc tree + content (no nav)")
    }

    System_Ext(server, "NW Teams Server")

    Rel(user, shell, "Navigates via hash routes")
    Rel(shell, nav, "Renders in sticky header")
    Rel(shell, overview, "Renders overview route content")
    Rel(shell, projectView, "Renders project route content")
    Rel(shell, featureBoard, "Renders feature-board route content")
    Rel(shell, featureDocs, "Renders feature-docs route content")
    Rel(featureDocs, docViewer, "Embeds for document display")
    Rel(overview, server, "Fetches project list")
    Rel(featureBoard, server, "Fetches roadmap data")
    Rel(featureDocs, server, "Fetches doc tree + content")
```

### C4 Component (L3) -- Navigation Architecture (Before vs After)

```mermaid
graph TB
    subgraph "BEFORE: Inconsistent Navigation"
        A1[App.tsx FeatureBoardView route] -->|header| B1[FeatureNavHeader<br>breadcrumb+tabs in PageShell]
        A2[App.tsx FeatureDocsRouteView route] -->|header| B2["Plain h1 in PageShell"]
        A2 -->|content| C2[FeatureDocsView<br>breadcrumb+tabs in content area]
        A3[App.tsx DocsView route] -->|header| B3[ProjectTabs in PageShell]
        A3 -->|content| C3[DocViewer<br>ALSO renders Board/Docs nav]
    end

    subgraph "AFTER: Unified Navigation"
        D1[App.tsx FeatureBoardView route] -->|header| E1[FeatureNavHeader<br>breadcrumb+tabs in PageShell]
        D2[App.tsx FeatureDocsRouteView route] -->|header| E2[FeatureNavHeader<br>breadcrumb+tabs in PageShell]
        D2 -->|content| F2[FeatureDocsView<br>NO breadcrumb/tabs - content only]
        D3[App.tsx DocsView route] -->|header| E3[ProjectTabs in PageShell]
        D3 -->|content| F3[DocViewer<br>NO Board/Docs nav]
    end
```

## Component Architecture

### Boundary Changes

#### 1. OverviewDashboard
- **Add Project button**: Left-aligned with "+" icon prefix, no longer `justify-end`
- **AddProjectDialog**: Constrained width (not full-width), rendered inline above grid

#### 2. ProjectCard
- **Density**: Reduced padding and spacing for compact layout
- **Grid**: 4+ columns on large screens instead of 3

#### 3. FeatureCard
- **Remove**: `onBoardClick` and `onDocsClick` props and Board/Docs button row
- **Add**: `onClick` prop -- entire card is clickable
- **Navigation**: Card click navigates to feature board (if hasRoadmap) or feature docs

#### 4. ProjectFeatureView
- **Remove**: `onNavigateFeatureDocs` prop (no longer needed since cards navigate to board)
- **Adapt**: Pass single `onNavigateFeature` to FeatureCard's `onClick`
- **Grid**: 4+ columns on large screens instead of 3

#### 5. Navigation Unification (App.tsx + FeatureDocsView + DocViewer)
- **FeatureDocsRouteView** (App.tsx): Use `FeatureNavHeader` in PageShell header (same as FeatureBoardView route)
- **FeatureDocsView**: Remove breadcrumb and Board/Docs tab nav from content area -- render only ContextDropdowns + DocViewer
- **DocViewer**: Remove `onNavigateToBoard` prop and internal Board/Docs nav -- it is a pure doc display component
- **DocsView** (App.tsx): ProjectTabs already in header -- DocViewer no longer renders duplicate nav

### Props Changes Summary

| Component | Removed Props | Added/Changed Props |
|---|---|---|
| FeatureCard | onBoardClick, onDocsClick | onClick |
| ProjectFeatureView | onNavigateFeatureDocs | onNavigateFeature (single callback) |
| DocViewer | onNavigateToBoard | (removed) |
| FeatureDocsView | onNavigateOverview, onNavigateProject | (removed -- nav moves to PageShell header) |

## Technology Stack

No new dependencies. All changes use existing:
- **React 18** (MIT) -- component restructuring
- **Tailwind CSS v4** (MIT) -- spacing/sizing adjustments
- No new libraries required

## Integration Patterns

No new integration patterns. Existing hash-based routing unchanged. All navigation callbacks remain within the React component tree.

## Quality Attribute Strategies

| Attribute | Strategy |
|---|---|
| Usability | Consistent navigation across all feature routes; fewer clicks to reach feature board |
| Maintainability | Single navigation pattern (breadcrumb+tabs in PageShell header) eliminates 3 different nav implementations |
| Testability | Each component has single responsibility; DocViewer becomes pure display without nav logic |

## Deployment Architecture

No deployment changes. Same Vite SPA build, same server.

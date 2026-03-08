# Architecture Design: Project Docs Tab

## Overview

Add Board | Docs tab navigation to the project page header, replacing the plain "Agent Ensemble" title. Mirrors the navigation pattern established on the feature page (`FeatureNavHeader`).

## Change Summary

**Scope**: Minimal UI modification in existing React components
**Risk Level**: Low (reuses proven components)
**Estimated Files Modified**: 1 (App.tsx only - router already handles all routes)

## C4 System Context (Level 1)

```mermaid
C4Context
    title System Context: Agent Ensemble Board

    Person(user, "Developer", "Views project docs and feature boards")

    System(board, "Agent Ensemble Board", "React SPA displaying project/feature roadmaps and documentation")

    System_Ext(api, "Board API Server", "Serves project data, doc trees, and content")
    System_Ext(fs, "Project Filesystem", "docs/ directories containing markdown files")

    Rel(user, board, "navigates", "Browser")
    Rel(board, api, "fetches", "REST API")
    Rel(api, fs, "reads", "File I/O")
```

## C4 Container (Level 2)

```mermaid
C4Container
    title Container Diagram: Agent Ensemble Board

    Person(user, "Developer")

    Container_Boundary(spa, "React SPA") {
        Container(router, "Hash Router", "useRouter hook", "Parses URL hash, returns Route union")
        Container(app, "App Component", "React", "Renders view based on Route")
        Container(projectView, "ProjectView", "React", "Feature card list with header")
        Container(docsView, "DocsView", "React", "Project documentation viewer")
        Container(projectTabs, "ProjectTabs", "React", "Board | Docs tab navigation")
        Container(docViewer, "DocViewer", "React", "Tree sidebar + content panel")
    }

    Container_Ext(api, "Board API", "Express", "REST endpoints for projects and docs")

    Rel(user, router, "triggers", "hashchange event")
    Rel(router, app, "provides", "Route discriminated union")
    Rel(app, projectView, "renders when", "view='project'")
    Rel(app, docsView, "renders when", "view='docs'")
    Rel(projectView, projectTabs, "uses", "activeTab='board'")
    Rel(docsView, projectTabs, "uses", "activeTab='docs'")
    Rel(docsView, docViewer, "composes", "tree + fetchContent")
    Rel(docsView, api, "fetches", "GET /api/projects/{id}/docs/*")
```

## C4 Component (Level 3) - Affected Subsystem

```mermaid
C4Component
    title Component Diagram: Project Navigation Subsystem

    Container_Boundary(nav, "Project Navigation") {
        Component(projectTabs, "ProjectTabs", "Pure Component", "Renders Board | Docs tabs with active state")
        Component(projectView, "ProjectView", "Stateful Component", "Feature list page, uses PageShell")
        Component(docsView, "DocsView", "Stateful Component", "Documentation viewer page, uses PageShell")
        Component(pageShell, "PageShell", "Layout Component", "Header + main + connection indicator")
    }

    Container_Boundary(routing, "Routing") {
        Component(useRouter, "useRouter", "Hook", "Parses hash, returns Route union")
        Component(parseHash, "parseHash", "Pure Function", "Pattern matching on URL hash")
    }

    Component_Ext(featureList, "ProjectFeatureView", "Child of ProjectView")
    Component_Ext(docViewer, "DocViewer", "Child of DocsView")

    Rel(projectView, projectTabs, "renders in header", "activeTab='board'")
    Rel(docsView, projectTabs, "renders in header", "activeTab='docs'")
    Rel(projectView, pageShell, "wraps content", "headerContent prop")
    Rel(docsView, pageShell, "wraps content", "headerContent prop")
    Rel(projectTabs, parseHash, "generates hrefs for", "Board: #/projects/{id}, Docs: #/projects/{id}/docs")
    Rel(useRouter, parseHash, "calls", "on hashchange")
```

## Component Boundaries

### Modified Components

| Component | Current State | Target State |
|-----------|--------------|--------------|
| `ProjectView` | Plain `<h1>` header | Uses `ProjectTabs` with `activeTab="board"` |
| `DocsView` | Already uses `ProjectTabs` | No change (reference implementation) |
| `ProjectTabs` | Board href = `/projects/{id}/board` | Board href = `/projects/{id}` |

### Unchanged Components

- `DocViewer` - Reused as-is
- `useDocTree` - Reused as-is
- `PageShell` - Reused as-is
- `useRouter` - Already handles all routes correctly

## Integration Patterns

### Data Flow

```
URL Hash Change
     |
     v
parseHash() -----> Route { view: 'project' | 'docs', projectId }
     |
     v
App.renderRoute() --> ProjectView | DocsView
     |                      |
     v                      v
ProjectTabs           DocViewer
(activeTab)           (tree, fetchContent)
```

### API Integration

Project documentation already supported:
- `GET /api/projects/{projectId}/docs/tree` - Returns `DocTree`
- `GET /api/projects/{projectId}/docs/content?path={path}` - Returns markdown content

No new API endpoints required.

## Quality Attribute Strategies

| Attribute | Strategy |
|-----------|----------|
| Maintainability | Reuse existing `ProjectTabs` and `DocViewer` components |
| Consistency | Match feature page navigation pattern exactly |
| Testability | Pure functions for routing, stateless tab component |
| Usability | Single-click access to project docs |

## Deployment Architecture

No deployment changes. Frontend bundle includes all components. Existing API serves docs.

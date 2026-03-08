# Component Boundaries: Project Docs Tab

## Boundary Definition

### ProjectTabs (Modified)

**Responsibility**: Render Board | Docs tab navigation with active state highlighting

**Interface**:
```typescript
interface ProjectTabsProps {
  readonly projectId: string;
  readonly activeTab: 'board' | 'docs';
}
```

**Current Behavior** (to change):
- Board tab href: `#/projects/${projectId}/board` (renders `BoardView` - kanban roadmap)

**Target Behavior**:
- Board tab href: `#/projects/${projectId}` (renders `ProjectView` - feature list)

**Boundary Rule**: Pure presentational component. No state, no effects. Receives props, renders UI.

### ProjectView (Modified)

**Responsibility**: Render project feature list page with header navigation

**Current Header**:
```tsx
<h1 className="text-xl font-semibold text-gray-100">Agent Ensemble</h1>
```

**Target Header**:
```tsx
<ProjectTabs projectId={projectId} activeTab="board" />
```

**Boundary Rule**: Owns feature list state. Delegates header rendering to `ProjectTabs`. Delegates layout to `PageShell`.

### DocsView (Unchanged - Reference)

**Responsibility**: Render project documentation viewer page

**Current Implementation** (reference for consistency):
```tsx
<PageShell
  connectionStatus={connectionStatus}
  headerContent={<ProjectTabs projectId={projectId} activeTab="docs" />}
>
  <DocViewer ... />
</PageShell>
```

**Boundary Rule**: Owns doc tree state via `useDocTree`. Delegates tree/content display to `DocViewer`.

## Route-to-View Mapping

| Route Pattern | View | Component | Tab State |
|---------------|------|-----------|-----------|
| `#/projects/{id}` | `project` | `ProjectView` | `activeTab="board"` |
| `#/projects/{id}/board` | `board` | `BoardView` | N/A (kanban) |
| `#/projects/{id}/docs` | `docs` | `DocsView` | `activeTab="docs"` |

## Data Flow Boundaries

### ProjectView Data Flow
```
URL: #/projects/nw-teams
        |
        v
useRouter() --> { view: 'project', projectId: 'nw-teams' }
        |
        v
ProjectView
    |-- useProjectList(WS_URL) --> connectionStatus
    |-- useFeatureList(projectId) --> features
    |-- useArchivedFeatures(projectId) --> archivedFeatures
    |
    v
PageShell(headerContent: ProjectTabs)
    |
    v
ProjectFeatureView(features, ...)
```

### DocsView Data Flow (Reference)
```
URL: #/projects/nw-teams/docs
        |
        v
useRouter() --> { view: 'docs', projectId: 'nw-teams' }
        |
        v
DocsView
    |-- useProjectList(WS_URL) --> connectionStatus
    |-- useDocTree(projectId) --> tree, error
    |-- fetchContent(path) --> markdown string
    |
    v
PageShell(headerContent: ProjectTabs)
    |
    v
DocViewer(tree, fetchContent, error)
```

## Pure Core / Effect Shell

Following functional paradigm:

**Pure Functions** (no side effects):
- `parseHash(hash: string): Route` - URL to route transformation
- `ProjectTabs` - props to JSX transformation

**Effect Boundary** (hooks with side effects):
- `useRouter()` - window.addEventListener for hashchange
- `useDocTree()` - fetch API call
- `useProjectList()` - WebSocket subscription

**Composition**:
- `ProjectView` composes pure `ProjectTabs` with effectful hooks
- `DocsView` composes pure `DocViewer` with effectful `useDocTree`

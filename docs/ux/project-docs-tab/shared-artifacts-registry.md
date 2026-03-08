# Shared Artifacts Registry: project-docs-tab

**Epic**: project-docs-tab
**Date**: 2026-03-06

## Artifacts

### projectId

| Property | Value |
|----------|-------|
| Source of truth | URL hash segment: `#/projects/{projectId}` or `#/projects/{projectId}/docs` |
| Consumers | ProjectTabs breadcrumb, Board tab href, Docs tab href, `useDocTree(projectId)` hook, `fetchContent` API call |
| Owner | Router (`useRouter` hook, `parseHash` function) |
| Integration risk | LOW -- already established pattern, used across all project-level views |
| Validation | Verify projectId in URL matches projectId passed to all child components and API calls |

### activeTab

| Property | Value |
|----------|-------|
| Source of truth | Route view type from `useRouter`: `'project'` maps to Board, `'docs'` maps to Docs |
| Consumers | ProjectTabs active tab highlight, PageShell headerContent |
| Owner | Route resolution in `App.tsx` `renderRoute` function |
| Integration risk | MEDIUM -- the ProjectView currently renders at `#/projects/{projectId}` (view: 'project') while BoardView renders at `#/projects/{projectId}/board` (view: 'board'). The Board tab in ProjectTabs links to `/board`, creating a disconnect. |
| Validation | Verify active tab visual state matches current URL route |

### docTree

| Property | Value |
|----------|-------|
| Source of truth | API endpoint: `GET /api/projects/{projectId}/docs/tree` |
| Consumers | DocViewer sidebar tree component |
| Owner | `useDocTree(projectId)` hook |
| Integration risk | LOW -- existing hook and API, already used by DocsView |
| Validation | Verify tree structure renders correctly in DocViewer sidebar |

### selectedDocPath

| Property | Value |
|----------|-------|
| Source of truth | User interaction: click on sidebar tree item |
| Consumers | DocContent component, CopyPathButton, `fetchContent` API call |
| Owner | DocViewer component local state |
| Integration risk | LOW -- contained within DocViewer, no cross-component sharing |
| Validation | Verify selected path matches content displayed and path shown in CopyPathButton |

## Integration Risk Summary

| Risk | Severity | Description | Mitigation |
|------|----------|-------------|------------|
| Board tab destination mismatch | MEDIUM | ProjectTabs Board tab links to `#/projects/{id}/board` (BoardView showing roadmap), but the feature list lives at `#/projects/{id}` (ProjectView). Need to decide: should Board tab show feature list or roadmap? | Design decision needed -- documented in user story technical notes |
| Existing DocsView reuse | LOW | DocsView component already exists and works with ProjectTabs. The change is on ProjectView to also use ProjectTabs instead of plain `<h1>`. | Straightforward -- just swap headerContent in ProjectView |

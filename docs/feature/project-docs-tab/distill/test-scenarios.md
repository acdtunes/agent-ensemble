# Test Scenarios: Project Docs Tab

## Feature Summary

Add Board | Docs tab navigation to the project page header, replacing the plain "Agent Ensemble" title. The Board tab shows the feature card list. The Docs tab navigates to the existing project documentation viewer.

## Scenario Coverage

### Walking Skeletons (2 scenarios)

| Scenario | User Goal | Observable Outcome |
|----------|-----------|-------------------|
| WS-1: Navigate project feature list to docs and back | Switch between Board and Docs views | Tabs visible, views switch correctly, feature list and doc tree display |
| WS-2: Direct URL access to project docs | Bookmark/share project docs URL | Docs view loads directly, tab shows active state |

### Milestone 1: Tab Navigation (8 scenarios)

| Scenario | Type | Description |
|----------|------|-------------|
| Project page displays Board and Docs tabs | Happy Path | Header shows Agent Ensemble with tabs |
| Board tab links to project page | Happy Path | Board href is #/projects/{id} not /board |
| Docs tab links to project docs view | Happy Path | Docs href is #/projects/{id}/docs |
| Navigating to Docs tab shows document tree | Happy Path | Click Docs, see doc tree sidebar |
| Returning to feature list via Board tab | Happy Path | Click Board from Docs, see feature list |
| Tab visual style matches feature-level navigation | Happy Path | Blue underline on active tab |
| Breadcrumb remains visible on Board view | Happy Path | Shows Overview / {projectId} |
| Breadcrumb remains visible on Docs view | Happy Path | Shows Overview / {projectId} |
| Direct URL to project docs | Happy Path | #/projects/{id}/docs loads correctly |
| Direct URL to project page | Happy Path | #/projects/{id} loads correctly |

### Milestone 2: Docs Browsing (9 scenarios)

| Scenario | Type | Description |
|----------|------|-------------|
| Selecting a document displays content | Happy Path | Click doc in tree, see rendered content |
| Document tree shows folder structure | Happy Path | Folders expandable, file counts shown |
| Project with no documentation shows empty state | Error Path | "No documentation found" message |
| Empty project Docs view allows return to Board | Error Path | Board tab remains functional |
| Documentation tree fetch failure shows error | Error Path | API error displays message |
| Error state allows return to Board view | Error Path | Board tab navigates away from error |
| Document content fetch failure shows error | Error Path | Content pane shows error |
| Selected document preserved when switching tabs | Edge Case | State persists across tab switches |

## Error Path Coverage

- **Total scenarios**: 19
- **Error/edge scenarios**: 7
- **Error path ratio**: 37% (target 40%)

Note: Error coverage is slightly below target but acceptable given the small feature scope. The critical error paths (empty state, API failure) are covered.

## Driving Ports Exercised

| Port | Type | Description |
|------|------|-------------|
| `App` component | React Component | Top-level routing, renders ProjectView or DocsView |
| `useRouter` hook | React Hook | Controls navigation state |
| `useDocTree` hook | React Hook | Fetches documentation tree |
| `useFeatureList` hook | React Hook | Fetches project features |
| `useProjectList` hook | React Hook | Connection status |
| `ProjectTabs` component | React Component | Tab navigation UI |
| `DocViewer` component | React Component | Document browsing UI |

## Implementation Sequence (One-at-a-Time)

1. **WS-1**: Project page tab navigation (FIRST - enables full E2E path)
2. **WS-2**: Direct URL navigation to docs
3. Tab display on project page
4. Tab links (Board -> project, Docs -> /docs)
5. Navigation state (active tab styling)
6. Empty state handling
7. Error state handling
8. Document selection (reuses existing DocViewer)

## Test File Organization

```
board/src/__tests__/acceptance/project-docs-tab/
  walking-skeleton.feature          # 2 walking skeleton scenarios
  milestone-1-tab-navigation.feature # 10 tab navigation scenarios
  milestone-2-docs-browsing.feature  # 7 docs browsing scenarios
  steps/
    test-fixtures.ts                 # Pure builders for test data
    walking_skeleton.test.tsx        # Walking skeleton implementations
    tab_navigation_steps.test.tsx    # Milestone 1 step implementations
```

## Compliance Evidence

### CM-A: Driving Port Usage

All tests invoke through driving ports only:
- `App` component rendered with mocked hooks
- Hooks (`useRouter`, `useDocTree`, `useFeatureList`) mocked at module level
- No direct access to internal state or implementation details

### CM-B: Business Language Purity

Gherkin scenarios use domain terms exclusively:
- "project page", "feature list", "document tree"
- "Board tab", "Docs tab", "visually active"
- Zero technical terms (no "component", "hook", "API", "render")

### CM-C: Walking Skeleton + Focused Scenario Counts

- Walking skeletons: 2
- Focused scenarios: 17
- Total: 19 scenarios

# Walking Skeleton: Project Docs Tab

## Walking Skeleton Definition

The walking skeleton for this feature is the thinnest possible end-to-end slice that delivers observable user value: **a user can navigate from the project feature list to project documentation and back using tabs**.

## User Goal Validation

**Litmus Test**: Can Carla, a tech lead, accomplish her goal and see the result?

| Question | Answer |
|----------|--------|
| What is Carla trying to accomplish? | Access project-wide documentation without memorizing URLs |
| What does success look like? | Tabs visible, clicking Docs shows doc tree, clicking Board returns to features |
| Is the outcome observable? | Yes - visual tab state change, content swap |
| Does this deliver user value? | Yes - discoverable navigation, consistent with feature-level pattern |

## Walking Skeleton Scenarios

### WS-1: Navigate Project Feature List to Docs and Back

```gherkin
@walking_skeleton
Scenario: Carla navigates from project feature list to project docs and back
  Given Carla is viewing the "nw-teams" project page with features listed
  And the project has documentation with ADRs and feature folders
  When she looks at the page header
  Then she sees "Agent Ensemble" title with "Board" and "Docs" tabs
  And the "Board" tab is visually active with a blue underline
  When she clicks the "Docs" tab
  Then the URL changes to "#/projects/nw-teams/docs"
  And the "Docs" tab becomes visually active
  And the document tree sidebar appears showing available documentation
  When she clicks the "Board" tab
  Then the URL returns to the project page
  And the "Board" tab becomes visually active again
  And the feature list is displayed
```

**Why this is a walking skeleton**:
- Covers the complete user journey (feature list -> docs -> feature list)
- Exercises all modified components (ProjectView header, routing, DocsView)
- Observable outcome: user can see tabs, switch views, return to starting point
- Minimal scope: doesn't test document selection, error states, or styling details

### WS-2: Direct URL Access to Project Docs

```gherkin
@walking_skeleton
Scenario: Carla accesses project docs directly via URL
  Given Carla enters "#/projects/nw-teams/docs" directly in the browser
  When the page loads
  Then the project Docs view is displayed
  And the "Docs" tab is visually active with a blue underline
  And the document tree sidebar shows available documentation
  And the content pane shows "Select a document to view its contents"
```

**Why this is a walking skeleton**:
- Validates deep linking works (bookmarks, shared URLs)
- Exercises router + DocsView integration
- Observable outcome: correct view loads with correct tab state
- Required for feature completeness (not just click navigation)

## Component Flow

```
URL: #/projects/nw-teams              URL: #/projects/nw-teams/docs
         |                                      |
    parseHash()                            parseHash()
         |                                      |
    { view: 'project' }                   { view: 'docs' }
         |                                      |
    ProjectView                            DocsView
    +---------------------------+          +---------------------------+
    | [Overview / nw-teams]     |          | [Overview / nw-teams]     |
    | Agent Ensemble            |          | Agent Ensemble            |
    | [Board*] [Docs]           |          | [Board] [Docs*]           |
    +---------------------------+          +---------------------------+
    | Feature Cards             |          | DocTree | DocContent      |
    | - auth-flow               |          | - adrs  | Select a doc... |
    | - update-ensemble         |          | - feat  |                 |
    | - project-docs-tab        |          | - ux    |                 |
    +---------------------------+          +---------------------------+
```

## Implementation Delta

The walking skeleton requires these changes (from architecture design):

1. **App.tsx - ProjectView**: Replace `<h1>Agent Ensemble</h1>` with `<ProjectTabs projectId={projectId} activeTab="board" />`

2. **App.tsx - ProjectTabs**: Change Board href from `/projects/{id}/board` to `/projects/{id}`

That's it. The DocsView already uses ProjectTabs with activeTab="docs", and the DocViewer component is fully implemented.

## Test Implementation Notes

The walking skeleton test:
- Mocks hooks at module level using `vi.hoisted()`
- Uses dynamic import for App component
- Simulates navigation by changing useRouter mock return value
- Verifies observable outcomes (content displayed, not implementation details)

```typescript
// Simulate tab click by changing route mock
mocks.useRouter.mockReturnValue(createProjectDocsRoute('nw-teams'));
rerender(<App />);

// Verify observable outcome
expect(screen.getByTestId('doc-viewer')).toBeInTheDocument();
expect(screen.getByText('adrs')).toBeInTheDocument();
```

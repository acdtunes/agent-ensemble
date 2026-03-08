# ADR-015: Project Board Tab Destination

## Status

Accepted

## Context

Adding Board | Docs tabs to the project page header requires deciding where the Board tab navigates:

**Current State**:
- `ProjectTabs` component exists (App.tsx:162-198)
- Board tab href: `#/projects/{id}/board` which renders `BoardView` (kanban roadmap)
- Project feature list is at `#/projects/{id}` which renders `ProjectView`

**The Problem**:
When adding tabs to `ProjectView`, clicking "Board" would navigate away to `BoardView` (a different view showing project-level kanban), not stay on the feature list.

**User Mental Model**:
At feature level, Board tab shows the feature roadmap board. At project level, users expect Board tab to show the project's "main view" - the feature list. The kanban roadmap (`BoardView`) is a secondary view for projects that have a roadmap.yaml at root level.

## Decision

Change Board tab href from `#/projects/{id}/board` to `#/projects/{id}`.

The Board tab at project level navigates to the feature list (`ProjectView`), not the kanban roadmap (`BoardView`).

## Alternatives Considered

### Alternative 1: Keep Board Tab Pointing to BoardView

**What**: Leave `ProjectTabs` Board href as `#/projects/{id}/board`, rendering the kanban roadmap.

**Expected Impact**: 100% technically correct (tabs navigate to distinct views).

**Why Rejected**:
- Breaks user mental model: "Board" at project level should show project content (feature list), not an optional roadmap
- Most projects don't have a root-level roadmap.yaml - BoardView shows "Waiting for server..." placeholder
- Creates inconsistency: clicking Board on project page navigates away from feature list with no obvious way back
- Feature page pattern: Board shows the main content (roadmap board), Docs shows documentation. Project page should mirror: Board shows main content (feature list), Docs shows documentation.

### Alternative 2: Add Third Tab "Roadmap"

**What**: Keep Board pointing to feature list, add separate "Roadmap" tab for `BoardView`.

**Expected Impact**: 100% - all views accessible, clearest semantics.

**Why Rejected**:
- Over-engineering for rare use case (few projects have root roadmap.yaml)
- Inconsistent with feature page (two tabs, not three)
- Increases cognitive load
- Can be added later if demand emerges

### Alternative 3: Conditional Tab Based on Roadmap Existence

**What**: Show Board tab only if project has roadmap.yaml, otherwise hide it.

**Expected Impact**: 80% - clean for most projects, confusing for projects with roadmaps.

**Why Rejected**:
- Adds complexity: must fetch roadmap existence before rendering tabs
- Inconsistent UI across projects
- Violates principle of least surprise (tabs appear/disappear)

## Consequences

### Positive
- Consistent mental model: Board = main content, Docs = documentation
- Matches feature page pattern users already understand
- Simple change: single href modification
- Feature list remains default project landing page

### Negative
- `BoardView` (project kanban) no longer directly accessible from tabs
- Must navigate via URL or could add link elsewhere if needed

### Mitigation
The BoardView remains accessible via direct URL `#/projects/{id}/board`. If user demand emerges for tab access to project-level kanban, implement Alternative 2 (add Roadmap tab). This decision is easily reversible.

## Implementation Notes

Single line change in `ProjectTabs` component:
```diff
- href={`#/projects/${projectId}/board`}
+ href={`#/projects/${projectId}`}
```

No router changes needed - both routes already defined and working.

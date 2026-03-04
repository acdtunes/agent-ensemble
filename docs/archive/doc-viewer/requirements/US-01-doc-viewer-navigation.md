# US-01: Board-to-Docs Navigation and Document Tree

## Problem
Andres Dandrea is a solo developer who monitors multi-agent deliveries on the board app (a generic tool for any development project). When he needs to recall a decision, requirement, or design detail mid-work, he finds it disruptive to switch to the IDE to browse docs. The IDE markdown preview is split-pane, navigation requires file-tree hunting, and the context switch breaks his working rhythm.

## Who
- Solo developer | Monitoring delivery on the board app | Wants to access project docs without leaving the board

## Solution
Add a "Docs" tab to the project navigation in the board app. When clicked, it navigates to a doc viewer with a collapsible sidebar showing the project's documentation tree, auto-discovered from the filesystem. The tree is organized by category (ADRs, Features) and by wave (discuss, design, distill) for feature docs.

## Job Story Traceability
- **JS-01**: Review Documentation During Feature Work (primary)
- **JS-02**: Cross-Reference Documentation During Review (primary)
- **JS-04**: Discover Documentation from Board Context (secondary)

## Domain Examples

### 1: Happy Path -- Navigate to docs from board
Andres Dandrea is viewing the board for project "nw-teams" at `#/projects/nw-teams/board`. He clicks the "Docs" tab in the project header. The URL changes to `#/projects/nw-teams/docs`. The sidebar loads showing: ADRs (8 documents), Features (card-redesign with 15 docs across discuss/design/distill, kanban-board with 4 docs, multi-project-board with 4 docs). The content panel shows a helpful empty state with document counts.

### 2: Edge Case -- Project with deep nested doc structure
Andres navigates to docs for project "acme-api". The project's configured documentation root contains ADRs, three feature folders each with discuss/design/distill waves, and a flat folder of runbooks. The tree renders the full hierarchy faithfully, grouping by category and preserving the folder structure.

### 3: Error/Boundary -- Project with no documentation
Andres navigates to docs for a newly created project whose configured documentation root does not exist or is empty. The sidebar shows an empty state: "No documentation found for this project." The content panel mirrors the same message.

## UAT Scenarios (BDD)

### Scenario: Navigate from board to docs via tab
Given Andres Dandrea is viewing the board for project "nw-teams" at "#/projects/nw-teams/board"
And the project header shows tabs "Board" and "Docs"
When he clicks the "Docs" tab
Then the URL changes to "#/projects/nw-teams/docs"
And the doc viewer loads with a sidebar showing the document tree
And the content panel shows an empty state with document counts

### Scenario: Document tree reflects filesystem structure
Given Andres has navigated to docs for project "nw-teams"
When the doc viewer loads
Then the sidebar shows a collapsible tree with "ADRs (8)" and "Features"
And expanding "card-redesign" shows sub-folders: "discuss (7)", "design (3)", "distill (5)"
And the tree structure matches the actual filesystem organization

### Scenario: Expand and collapse tree folders
Given Andres is viewing the doc tree with all folders collapsed
When he clicks on the "ADRs" folder header
Then the folder expands showing 8 ADR document entries
And clicking the folder header again collapses it

### Scenario: Navigate back to board from docs
Given Andres is viewing docs for project "nw-teams"
When he clicks the "Board" tab in the project header
Then the URL changes to "#/projects/nw-teams/board"
And the board view loads with the kanban board

### Scenario: Project with no documentation
Given a project "empty-project" has a configured documentation root that does not exist
When Andres navigates to "#/projects/empty-project/docs"
Then the sidebar shows "No documentation found"
And the content panel displays a helpful empty state message

## Acceptance Criteria
- [ ] "Docs" tab visible in project header navigation alongside "Board" tab
- [ ] Clicking "Docs" navigates to `#/projects/{id}/docs` route
- [ ] Document tree auto-discovered from filesystem (no manual configuration)
- [ ] Tree organized by category (ADRs, Features) with document counts
- [ ] Feature folders show wave sub-folders (discuss, design, distill) when applicable
- [ ] Tree folders are collapsible/expandable
- [ ] Empty state shown when no docs exist for the project
- [ ] Navigation back to board works via "Board" tab

## Technical Notes
- New route required: `#/projects/{id}/docs` -- extends existing hash router
- New API endpoint: `GET /api/projects/{projectId}/docs/tree` -- scans filesystem for markdown files
- Documentation root is configurable per project (part of existing project registration/discovery mechanism)
- Tree discovery should be a pure function: `(docsRoot: string) => Result<DocTree, DocTreeError>`
- No persistent storage -- tree built on-demand from filesystem

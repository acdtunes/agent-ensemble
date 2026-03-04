# US-04: Document Search by Filename

## Problem
Andres Dandrea is a solo developer who knows what concept he is looking for but not always which document contains it. The project has 23+ documentation files across nested folders (ADRs, features, waves). Browsing the tree to find the right document requires expanding multiple folders and scanning names. When the doc structure grows, this becomes increasingly slow.

## Who
- Solo developer | Searching for a specific document | Wants to find docs by keyword without browsing every folder

## Solution
A search input at the top of the document tree sidebar. Typing filters the tree to show only documents whose filename matches the query. Results update as the user types. Clearing the search restores the full tree.

## Job Story Traceability
- **JS-05**: Search Across All Documentation (primary -- promoted to Must Have per user feedback)
- **JS-02**: Cross-Reference Documentation During Review (supporting)

## Domain Examples

### 1: Happy Path -- Search for an ADR by keyword
Andres types "state management" in the search field. The tree filters to show only "ADR-001-multi-project-state-management" under ADRs. All other documents are hidden. He clicks the result to open it.

### 2: Edge Case -- Search matching multiple documents
Andres types "architecture" in the search field. The tree shows: "architecture-design.md" under card-redesign/design, "architecture-design.md" under kanban-board/design, and "architecture-design.md" under multi-project-board/design. The parent folder structure is preserved so he can distinguish them.

### 3: Error/Boundary -- No results for search query
Andres types "kubernetes" in the search field. No documents match. The tree shows: "No documents match your search." He clears the search field and the full tree is restored.

## UAT Scenarios (BDD)

### Scenario: Filter tree by filename keyword
Given Andres is viewing the doc tree for project "nw-teams"
When he types "state management" in the search field
Then the tree shows only documents with "state management" in their filename
And "ADR-001-multi-project-state-management" is visible
And documents not matching are hidden

### Scenario: Search preserves parent folder context
Given Andres types "architecture" in the search field
And multiple documents match across different features
When the filtered tree renders
Then each matching document shows its parent folder path
And Andres can distinguish "card-redesign > design > architecture-design.md" from "kanban-board > design > architecture-design.md"

### Scenario: Search with no results
Given Andres types "kubernetes" in the search field
And no documents contain that keyword in their filename
When the filtered tree renders
Then the tree shows "No documents match your search"
And the search field remains editable

### Scenario: Clear search restores full tree
Given Andres has an active search filter showing 2 results
When he clears the search field (backspace or clear button)
Then the full document tree is restored
And all folders return to their previous expand/collapse state

### Scenario: Search is case-insensitive
Given the project has a document named "ADR-001-multi-project-state-management.md"
When Andres types "STATE MANAGEMENT" in the search field
Then "ADR-001-multi-project-state-management" is shown in the results

## Acceptance Criteria
- [ ] Search input visible at top of document tree sidebar
- [ ] Typing filters tree to show only filename matches
- [ ] Filtering is case-insensitive
- [ ] Parent folder context preserved for disambiguation
- [ ] Empty results show "No documents match your search" message
- [ ] Clearing search restores full tree
- [ ] Filtering happens as user types (no submit button needed)

## Technical Notes
- Client-side filtering only (filter the already-loaded tree, no server round-trip)
- Search matches against filename, not file content (full-text search is a separate, future story)
- Depends on US-01 (document tree) being loaded
- Search is purely cosmetic filtering -- does not change URL or persist state

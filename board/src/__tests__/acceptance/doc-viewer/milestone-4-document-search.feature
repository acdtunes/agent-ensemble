Feature: Document Search by Filename
  As Andres, a solo developer with 23+ documentation files,
  I want to filter the document tree by filename keyword,
  so I can find the right document without browsing every folder.

  # ================================================================
  # US-04: Document Search (9 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-04
  Scenario: Filter tree by filename keyword
    Given Andres is viewing the doc tree for project "nw-teams"
    And the tree contains "ADR-001-multi-project-state-management.md" among 23 documents
    When he types "state management" in the search field
    Then the tree shows only documents with "state management" in their filename
    And "ADR-001-multi-project-state-management" is visible
    And documents not matching are hidden

  @US-04 @skip
  Scenario: Search preserves parent folder context
    Given Andres types "architecture" in the search field
    And "architecture-design.md" exists under "card-redesign/design" and "kanban-board/design"
    When the filtered tree renders
    Then each matching document shows its parent folder path
    And Andres can distinguish "card-redesign > design" from "kanban-board > design"

  @US-04 @skip
  Scenario: Clear search restores full tree
    Given Andres has an active search filter showing 2 results
    When he clears the search field
    Then the full document tree is restored
    And all folders return to their previous expand/collapse state

  @US-04 @skip
  Scenario: Search is case-insensitive
    Given the project has a document named "ADR-001-multi-project-state-management.md"
    When Andres types "STATE MANAGEMENT" in the search field
    Then "ADR-001-multi-project-state-management" is shown in the results

  @US-04 @skip
  Scenario: Search updates as user types
    Given Andres is viewing the doc tree
    When he types "arch" in the search field
    Then the tree filters immediately without requiring a submit action
    And typing additional characters further narrows results

  # --- Error Path ---

  @US-04 @skip
  Scenario: Search with no results shows helpful message
    Given Andres types "kubernetes" in the search field
    And no documents contain "kubernetes" in their filename
    When the filtered tree renders
    Then the tree shows "No documents match your search"
    And the search field remains editable

  @US-04 @skip
  Scenario: Search on empty tree shows no results
    Given a project with no documentation
    When Andres types any keyword in the search field
    Then the tree shows "No documents match your search"

  # --- Boundary / Edge ---

  @US-04 @skip
  Scenario: Single character search filters effectively
    Given the doc tree contains documents with various names
    When Andres types "a" in the search field
    Then only documents containing "a" in their filename are shown

  @US-04 @skip @property
  Scenario: Clearing search always restores original tree completely
    Given any document tree and any search query that has been applied
    When the search field is cleared
    Then the resulting tree is identical to the tree before any search was performed

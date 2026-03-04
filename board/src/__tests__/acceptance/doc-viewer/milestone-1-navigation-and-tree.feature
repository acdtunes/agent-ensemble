Feature: Board-to-Docs Navigation and Document Tree
  As Andres, a solo developer,
  I want to navigate from the board to a documentation viewer with a structured tree,
  so I can browse project docs without switching to the IDE.

  # ================================================================
  # US-01: Navigation and Tree (13 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-01
  Scenario: Navigate from board to docs via tab
    Given Andres is viewing the board for project "nw-teams"
    And the project header shows "Board" and "Docs" tabs
    When he clicks the "Docs" tab
    Then the view changes to the doc viewer
    And the sidebar loads showing the document tree

  @US-01 @skip
  Scenario: Document tree reflects the project documentation structure
    Given Andres has navigated to docs for project "nw-teams"
    And the project documentation contains "ADRs" with 8 documents
    And the project documentation contains "Features" with sub-folders "card-redesign", "kanban-board"
    When the doc viewer loads
    Then the sidebar shows "ADRs (8)" as a collapsible folder
    And the sidebar shows "Features" with nested feature folders
    And "card-redesign" contains sub-folders "discuss", "design", "distill"

  @US-01 @skip
  Scenario: Expand and collapse tree folders
    Given Andres is viewing the doc tree with all folders collapsed
    When he clicks on the "ADRs" folder header
    Then the folder expands showing its document entries
    And clicking the folder header again collapses it

  @US-01 @skip
  Scenario: Navigate back to board from docs
    Given Andres is viewing docs for project "nw-teams"
    When he clicks the "Board" tab
    Then the view changes back to the board
    And the kanban board is displayed

  @US-01 @skip
  Scenario: Select a document from the tree
    Given Andres is viewing the doc tree for project "nw-teams"
    When he clicks on "ADR-001-state-management.md" in the tree
    Then the document is selected
    And the content panel shows the document content

  @US-01 @skip
  Scenario: Document tree sorts folders before files alphabetically
    Given a project documentation tree with folders "features", "adrs" and files "README.md", "CHANGELOG.md"
    When the tree renders
    Then folders appear before files
    And folders are sorted alphabetically: "adrs", "features"
    And files are sorted alphabetically: "CHANGELOG.md", "README.md"

  @US-01 @skip
  Scenario: Document tree shows accurate file counts per folder
    Given a project with "ADRs" containing 5 documents and "Features" containing 12 documents
    When the doc tree loads
    Then "ADRs" shows a count of 5
    And "Features" shows a count of 12

  # --- Error Path ---

  @US-01 @skip
  Scenario: Project with no documentation configured
    Given a project "empty-project" has no documentation root configured
    When Andres navigates to docs for "empty-project"
    Then the sidebar shows "No documentation found"
    And the content panel displays a helpful empty state message

  @US-01 @skip
  Scenario: Project with missing documentation directory
    Given a project "stale-project" has a documentation root that no longer exists on disk
    When Andres navigates to docs for "stale-project"
    Then the sidebar shows "No documentation found"

  @US-01 @skip
  Scenario: Unknown project shows error
    Given no project with ID "nonexistent" is registered
    When Andres navigates to docs for "nonexistent"
    Then an error message indicates the project was not found

  # --- Boundary / Edge ---

  @US-01 @skip
  Scenario: Deeply nested documentation structure renders faithfully
    Given a project with docs nested 4 levels deep: "features/card-redesign/discuss/jtbd"
    When the doc tree loads
    Then all 4 levels of nesting are visible and expandable

  @US-01 @skip
  Scenario: Only markdown files appear in the document tree
    Given a documentation folder containing "README.md", "diagram.png", and "notes.txt"
    When the doc tree loads
    Then only "README.md" is shown
    And non-markdown files are excluded

  @US-01 @skip @property
  Scenario: Tree structure always matches filesystem organization
    Given any valid documentation directory structure
    When the document tree is built
    Then every markdown file on disk appears in the tree
    And every folder containing markdown files appears as a directory node
    And no files outside the documentation root appear

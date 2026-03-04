Feature: Documentation Viewer Walking Skeletons
  As Andres, a solo developer monitoring multi-agent deliveries,
  I want to browse, read, and act on project documentation within the board app,
  so I can review docs, cross-reference decisions, and prompt AI agents without leaving the board.

  # Walking skeletons prove observable user value end-to-end.
  # Each answers: "Can Andres accomplish this goal and see the result?"

  @walking_skeleton
  Scenario: Andres navigates to docs, selects a document, and reads its content
    Given Andres is viewing the board for project "nw-teams"
    And the project has documentation with 3 ADRs and 2 feature folders
    When he clicks the "Docs" tab
    Then the doc viewer loads showing the document tree in the sidebar
    And the tree shows "ADRs" with 3 documents
    When he clicks on "ADR-001-state-management.md" in the tree
    Then the content panel renders the document with formatted headings and code blocks
    And the file path "docs/adrs/ADR-001-state-management.md" is displayed above the content

  @walking_skeleton
  Scenario: Andres copies a document path and uses it for AI agent prompting
    Given Andres is viewing the document "docs/adrs/ADR-001-state-management.md"
    And the file path is displayed above the rendered content
    When he clicks the copy button next to the path
    Then the path "docs/adrs/ADR-001-state-management.md" is copied to the clipboard
    And the button shows "Copied!" confirmation
    And after 2 seconds the button reverts to its default state

  @walking_skeleton
  Scenario: Andres searches for a document by filename keyword
    Given Andres is viewing the doc tree for project "nw-teams" with 23 documents
    When he types "architecture" in the search field
    Then the tree filters to show only documents with "architecture" in their name
    And matching documents show their parent folder for context
    When he clears the search field
    Then the full document tree is restored

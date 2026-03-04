Feature: Review Feature Documentation
  As a developer monitoring delivery on the board app
  I want to read, navigate, and act on project documentation within the board app
  So I can review docs and bridge to AI agent workflow without context-switching to the IDE

  Background:
    Given a project "acme-api" has a configured documentation root
    And the documentation root contains the following structure:
      | Category | Folder                          | Count |
      | ADRs     | adrs/                           |     8 |
      | Feature  | feature/auth/discuss            |     7 |
      | Feature  | feature/auth/design             |     3 |
      | Feature  | feature/auth/distill            |     5 |
      | Feature  | feature/payments/design         |     4 |

  # --- Step 1: Board to Docs Navigation ---

  Scenario: Navigate from board to docs
    Given Andres Dandrea is viewing the board for project "acme-api"
    And the project header shows tabs "Board" and "Docs"
    When he clicks the "Docs" tab
    Then the URL changes to "#/projects/acme-api/docs"
    And the doc viewer loads with a sidebar and content panel

  Scenario: Docs tab visible on board view
    Given Andres is viewing the board for project "acme-api"
    Then the project navigation shows "Board" as active and "Docs" as available
    And the "Board" tab is highlighted as the current view

  # --- Step 2: Document Tree Navigation ---

  Scenario: Document tree shows organized structure
    Given Andres has navigated to docs for project "acme-api"
    When the doc viewer loads
    Then the sidebar shows a collapsible tree with folders:
      | Folder    | Item Count |
      | ADRs      |          8 |
      | auth      |         15 |
      | payments  |          4 |
    And each feature folder is expandable to show wave sub-folders

  Scenario: Expand a feature folder to see waves
    Given Andres is viewing the doc tree for project "acme-api"
    When he expands the "auth" feature folder
    Then he sees sub-folders:
      | Sub-folder | Count |
      | discuss    |     7 |
      | design     |     3 |
      | distill    |     5 |
    And each sub-folder lists its document files

  Scenario: Empty state when no document selected
    Given Andres has navigated to docs for project "acme-api"
    And no document is selected
    Then the content panel shows a helpful empty state
    And the empty state displays the total document count
    And a message invites selecting a document from the tree

  # --- Step 3: Locate a Document ---

  Scenario: Select a document from the tree
    Given Andres is browsing the doc tree for project "acme-api"
    When he clicks "ADR-001-multi-project-state-management" in the ADRs folder
    Then the content panel renders the document with rich markdown formatting
    And the file path "adrs/ADR-001-multi-project-state-management.md" appears above the content
    And a copy button appears next to the file path
    And the tree highlights the selected document

  Scenario: Search for a document by keyword
    Given Andres is in the doc viewer for project "acme-api"
    When he types "state management" in the search field
    Then the tree filters to show only documents containing the query in their filename
    And "ADR-001-multi-project-state-management" is visible in the filtered results
    And documents not matching are hidden

  Scenario: Search with no results
    Given Andres is in the doc viewer for project "acme-api"
    When he types "xyznonexistent" in the search field
    Then the tree shows an empty state: "No documents match your search"
    And clearing the search restores the full tree

  # --- Step 4: Read with Rich Rendering ---

  Scenario: Markdown headings render with proper hierarchy
    Given Andres is viewing a document with h1 through h4 headings
    Then each heading level is visually distinct in size and weight
    And heading hierarchy is maintained (h1 largest, h4 smallest)

  Scenario: Code blocks render with syntax highlighting
    Given Andres is viewing a document with TypeScript code blocks
    Then code blocks appear in a monospace font with a distinct background
    And keywords, types, and strings are syntax-highlighted

  Scenario: Inline code renders distinctly
    Given Andres is viewing a document mentioning `currentState` inline
    Then the inline code appears with a monospace font and subtle background
    And it is visually distinct from surrounding prose

  Scenario: Tables render with structure
    Given Andres is viewing a document with a markdown table
    Then the table renders with visible borders or row separators
    And columns are properly aligned
    And the table is horizontally scrollable if it exceeds the content width

  Scenario: Mermaid diagrams render as visual diagrams
    Given Andres is viewing a document with a mermaid code block
    Then the mermaid block is rendered as a visual diagram (SVG)
    And if mermaid rendering fails, the raw code is shown as a formatted code block

  Scenario: Long documents are scrollable
    Given Andres is viewing a document with 200+ lines
    Then the content panel scrolls independently of the sidebar
    And the sidebar remains visible while scrolling the content

  # --- Step 5: Copy Path for AI Agent ---

  Scenario: Copy file path to clipboard
    Given Andres is viewing "ADR-001-multi-project-state-management.md"
    When he clicks the copy button next to the file path
    Then the document's relative file path is copied to the clipboard
    And the button shows "Copied!" confirmation text
    And after 2 seconds the button reverts to its default state

  Scenario: Copied path is relative from project root
    Given Andres is viewing a document at "feature/auth/discuss/jtbd-analysis.md"
    When he copies the file path
    Then the clipboard contains the relative path from the project's documentation root
    And the path does not include absolute filesystem prefixes

  # --- Error Paths ---

  Scenario: Project has no documentation
    Given Andres navigates to docs for a project with an empty or missing documentation root
    When the doc viewer loads
    Then the sidebar shows an empty state: "No documentation found"
    And the content panel displays a helpful empty state message

  Scenario: Document fails to load
    Given Andres clicks a document in the tree
    And the file cannot be read from the filesystem
    When the content panel attempts to render
    Then an error message appears: "Could not load this document"
    And the error suggests the file may have been moved or deleted
    And a "Retry" action is available

  Scenario: Keyboard navigation through document tree
    Given Andres is focused on the document tree
    When he uses arrow keys to navigate between items
    Then focus moves through tree items sequentially
    And Enter key selects the focused document
    And the selected document renders in the content panel

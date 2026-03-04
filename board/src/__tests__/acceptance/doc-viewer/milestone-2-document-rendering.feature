Feature: Rich Markdown Document Rendering
  As Andres, a solo developer,
  I want documents rendered with rich formatting including syntax highlighting and diagrams,
  so I can read documentation comfortably without switching to the IDE.

  # ================================================================
  # US-02: Document Rendering (12 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-02
  Scenario: Headings render with visual hierarchy
    Given Andres has selected a document containing h1, h2, and h3 headings
    When the content panel renders the document
    Then h1 is the largest and most prominent
    And h2 is visually smaller than h1
    And h3 is visually smaller than h2

  @US-02 @skip
  Scenario: Code blocks render with syntax highlighting
    Given Andres has selected a document containing a TypeScript code block
    When the content panel renders the document
    Then the code block appears with a distinct background
    And the code uses a monospace font
    And TypeScript keywords are syntax-highlighted with color

  @US-02 @skip
  Scenario: Inline code renders distinctly from prose
    Given Andres has selected a document mentioning "currentState" inline
    When the content panel renders the document
    Then "currentState" appears in monospace with a subtle background
    And it is visually distinct from surrounding text

  @US-02 @skip
  Scenario: Tables render with proper structure
    Given Andres has selected a document with a markdown table
    When the content panel renders the document
    Then the table shows visible row separators
    And columns are properly aligned
    And the header row is visually distinct from data rows

  @US-02 @skip
  Scenario: Mermaid diagrams render as visual diagrams
    Given Andres has selected a document containing a mermaid flowchart
    When the content panel renders the document
    Then the mermaid block is rendered as a visual diagram
    And the diagram is readable within the content panel

  @US-02 @skip
  Scenario: Content panel scrolls independently of sidebar
    Given Andres has selected a document with 300+ lines of content
    When he scrolls down in the content panel
    Then the content scrolls independently
    And the sidebar document tree remains visible and fixed

  # --- Error Path ---

  @US-02 @skip
  Scenario: Document fails to load because file was deleted
    Given Andres clicks a document in the tree
    And the file has been deleted from disk since the tree was loaded
    When the content panel attempts to load the document
    Then an error message shows "Could not load this document"
    And a retry button is available

  @US-02 @skip
  Scenario: Mermaid diagram with invalid syntax degrades to code block
    Given Andres has selected a document with a malformed mermaid block
    When the content panel renders the document
    Then the malformed mermaid source is shown as a formatted code block
    And the rest of the document renders normally

  @US-02 @skip
  Scenario: Retry after failed document load succeeds
    Given Andres is viewing an error message for a document that failed to load
    When the file becomes available again
    And he clicks the retry button
    Then the document content loads and renders successfully

  # --- Boundary / Edge ---

  @US-02 @skip
  Scenario: Empty document renders without error
    Given Andres has selected a document that is empty (zero bytes)
    When the content panel renders the document
    Then an empty content panel is shown without errors

  @US-02 @skip
  Scenario: Document with unsupported markdown extensions degrades gracefully
    Given Andres has selected a document with an unsupported markdown extension
    When the content panel renders the document
    Then the unsupported content is shown as raw text
    And no content is hidden or lost

  @US-02 @skip @property
  Scenario: Any valid markdown document renders without crashing
    Given any valid markdown document up to 1000 lines
    When the content panel renders the document
    Then the document renders without errors
    And all standard markdown elements are visible

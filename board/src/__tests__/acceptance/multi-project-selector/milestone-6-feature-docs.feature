Feature: Feature-Level Documentation View
  As Andres, a solo developer,
  I want to browse documentation scoped to a single feature directory
  and switch between features without losing context,
  so I can review feature-specific docs without wading through the entire project tree.

  # ================================================================
  # US-06: Feature-Level Documentation View (8 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-06
  Scenario: Feature docs tree is scoped to the feature directory
    Given project "nw-teams" is registered
    And feature "card-redesign" has documentation folders "discuss", "design", "distill"
    And "discuss" contains documents "jtbd-analysis.md" and "journey-card-monitoring.md"
    And "design" contains document "architecture-design.md"
    When Andres navigates to docs for feature "card-redesign" in project "nw-teams"
    Then the document tree shows only files within "card-redesign"
    And the tree shows folders "discuss", "design", "distill"
    And "discuss" shows 2 documents

  @US-06 @skip
  Scenario: Document content renders correctly from feature path
    Given Andres is viewing docs for feature "card-redesign" in project "nw-teams"
    When he clicks on "architecture-design.md" in the "design" folder
    Then the content panel renders the document with formatted headings
    And the file path shows "design/architecture-design.md"

  @US-06 @skip
  Scenario: Copy path copies project-relative path
    Given Andres is viewing the document "design/architecture-design.md" within feature "card-redesign"
    When he clicks the copy button next to the file path
    Then the path "docs/feature/card-redesign/design/architecture-design.md" is copied to the clipboard

  # --- Error Path ---

  @US-06 @skip
  Scenario: Feature with no documentation shows empty state
    Given project "nw-teams" is registered
    And feature "new-feature" has no documentation files
    When Andres navigates to docs for feature "new-feature"
    Then the document tree shows "No documentation found"
    And the content panel displays guidance on creating feature docs

  # --- Tab Switching ---

  @US-06 @skip
  Scenario: Board-Docs tab switching preserves feature context
    Given Andres is viewing docs for feature "doc-viewer" in project "nw-teams"
    When he clicks the "Board" tab
    Then the view switches to the board for feature "doc-viewer" in project "nw-teams"
    And the feature and project context are preserved

  # --- Context Switching ---

  @US-06 @skip
  Scenario: Switch feature from docs view via dropdown
    Given Andres is viewing docs for feature "card-redesign" in project "nw-teams"
    And project "nw-teams" has features "card-redesign", "doc-viewer", "kanban-board"
    When he selects "doc-viewer" from the feature dropdown
    Then the docs tree updates to show documentation for "doc-viewer"
    And the breadcrumb updates to "Overview / nw-teams / doc-viewer"

  @US-06 @skip
  Scenario: Switch project from docs view via dropdown
    Given Andres is viewing docs for feature "card-redesign" in project "nw-teams"
    And project "karateka" is also registered
    When he selects "karateka" from the project dropdown
    Then the view navigates to the feature list for "karateka"

  @US-06 @skip
  Scenario: Feature dropdown in docs view lists all features including docs-only
    Given project "nw-teams" has features "card-redesign" (with roadmap) and "kanban-board" (docs only)
    When Andres views the feature dropdown on the docs view
    Then the dropdown lists both "card-redesign" and "kanban-board"
    And docs-only features are available for documentation browsing

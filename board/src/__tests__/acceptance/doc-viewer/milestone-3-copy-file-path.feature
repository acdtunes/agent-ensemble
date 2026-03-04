Feature: Copy File Path for AI Agent Prompting
  As Andres, a solo developer reviewing documentation,
  I want to copy the file path of the current document with one click,
  so I can paste it into an AI agent prompt without switching to the IDE.

  # ================================================================
  # US-03: Copy File Path (10 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-03
  Scenario: Copy file path with one click
    Given Andres is viewing the document "docs/adrs/ADR-001-state-management.md"
    And the file path is displayed above the rendered content
    When he clicks the copy button next to the path
    Then the path "docs/adrs/ADR-001-state-management.md" is copied to the clipboard
    And the button shows "Copied!" text

  @US-03 @skip
  Scenario: Copy confirmation reverts after 2 seconds
    Given Andres has just clicked the copy button
    And the button shows "Copied!" text
    When 2 seconds have elapsed
    Then the button reverts to its default copy state

  @US-03 @skip
  Scenario: Copied path is relative from project root
    Given Andres is viewing a document at "docs/feature/card-redesign/discuss/jtbd-analysis.md"
    When he copies the file path
    Then the clipboard contains "docs/feature/card-redesign/discuss/jtbd-analysis.md"
    And the path does not start with an absolute prefix like "/Users/" or "C:\\"

  @US-03 @skip
  Scenario: File path always visible when viewing a document
    Given Andres has selected any document from the tree
    Then the file path is visible above the rendered content
    And the copy button is positioned next to the path

  @US-03 @skip
  Scenario: Copy button is keyboard accessible
    Given Andres is viewing a document and the copy button is focused
    When he activates the button with Enter or Space
    Then the file path is copied to the clipboard
    And the "Copied!" confirmation appears

  # --- Error Path ---

  @US-03 @skip
  Scenario: Copy fails when clipboard is unavailable
    Given Andres is viewing a document
    And the clipboard permission has been denied
    When he clicks the copy button
    Then the path text becomes selected for manual copying
    And a hint suggests manual copy

  @US-03 @skip
  Scenario: No copy button when no document is selected
    Given Andres is viewing the doc viewer with no document selected
    Then no file path is displayed
    And no copy button is visible

  @US-03 @skip
  Scenario: Rapid consecutive clicks do not cause duplicate clipboard writes
    Given Andres is viewing a document
    When he clicks the copy button twice rapidly
    Then the path is copied to the clipboard once
    And the confirmation shows "Copied!" without flickering

  # --- Boundary / Edge ---

  @US-03 @skip
  Scenario: Copy path for deeply nested document preserves full relative path
    Given Andres is viewing a document at "docs/feature/card-redesign/discuss/jtbd/sub-analysis.md"
    When he copies the file path
    Then the clipboard contains the full relative path including all nested folders

  @US-03 @skip @property
  Scenario: Displayed path always matches copied path
    Given any document selected from the tree
    When Andres copies the file path
    Then the path shown in the display matches the path copied to clipboard exactly

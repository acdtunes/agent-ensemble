Feature: Archive UI Components
  As a developer using the NW Teams board
  I want visual feedback when archiving and restoring features
  So that I can confidently manage my feature lifecycle

  # =================================================================
  # US-04: Confirmation Before Archive
  # =================================================================

  @us-04
  Scenario: Confirmation dialog shows feature name
    Given I am viewing feature "auth-system" in the project
    When I click the "Archive" button on the feature card
    Then a confirmation dialog appears
    And the dialog title is "Archive Feature?"
    And the dialog message contains "auth-system"
    And the dialog has "Cancel" and "Archive" buttons

  @us-04
  Scenario: Cancel closes dialog without archiving
    Given the archive confirmation dialog is open for "auth-system"
    When I click "Cancel"
    Then the dialog closes
    And "auth-system" remains in active features

  @us-04
  Scenario: Confirm triggers archive operation
    Given the archive confirmation dialog is open for "auth-system"
    When I click "Archive"
    Then the archive API is called for "auth-system"
    And the dialog closes on success

  @us-04
  Scenario: Loading state during archive
    Given I have confirmed archiving "auth-system"
    When the archive operation is in progress
    Then the "Archive" button shows "Archiving..."
    And the button is disabled

  # =================================================================
  # US-02: Archived Features Section
  # =================================================================

  @us-02
  Scenario: Archived section shows count
    Given 3 features are archived
    When I view the project page
    Then I see "Archived (3)" section header

  @us-02
  Scenario: Archived section is collapsed by default
    Given 2 features are archived
    When I view the project page
    Then the archived section is collapsed
    And I cannot see the archived feature names

  @us-02
  Scenario: Expanding archived section shows features
    Given 2 features are archived
    And the archived section is collapsed
    When I click the archived section header
    Then the section expands
    And I see all archived feature names
    And each has a "Restore" button

  @us-02
  Scenario: Empty archive hides section
    Given no features are archived
    When I view the project page
    Then the archived section is not visible

  # =================================================================
  # US-03: Restore from UI
  # =================================================================

  @us-03
  Scenario: Restore button triggers restore operation
    Given the archived section is expanded
    And "old-poc" is in the archived list
    When I click "Restore" for "old-poc"
    Then the restore API is called for "old-poc"

  @us-03
  Scenario: Restore loading state
    Given I have clicked restore for "old-poc"
    When the restore operation is in progress
    Then the "Restore" button shows "Restoring..."
    And the button is disabled

  @us-03
  Scenario: Feature moves from archived to active on restore
    Given "old-poc" is in the archived list
    When I restore "old-poc" successfully
    Then "old-poc" disappears from the archived section
    And "old-poc" appears in the active feature list

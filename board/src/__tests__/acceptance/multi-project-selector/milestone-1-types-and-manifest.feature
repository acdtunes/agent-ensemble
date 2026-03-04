Feature: Foundation Types, Path Resolution, and Manifest Store
  As Andres, a solo developer,
  I want my registered projects to persist across server restarts
  and feature paths to resolve correctly from project root,
  so I never lose my project list and feature navigation works reliably.

  # ================================================================
  # US-01: Add and Remove Projects via UI (5 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-01
  Scenario: Register a project by providing its folder path
    Given a valid project manifest with no registered projects
    And the folder "/Users/andres/projects/karateka" exists on disk
    When Andres adds the project at "/Users/andres/projects/karateka"
    Then the manifest contains project "karateka" with path "/Users/andres/projects/karateka"
    And the project list now includes "karateka"

  @US-01 @skip
  Scenario: Remove a project from the board
    Given a manifest with projects "karateka" and "nw-teams" registered
    When Andres removes project "karateka"
    Then the manifest no longer contains "karateka"
    And the project list shows only "nw-teams"

  # --- Error Path ---

  @US-01 @skip
  Scenario: Invalid path shows validation error
    Given a valid project manifest
    When Andres attempts to add a project at "/nonexistent/path/fake-project"
    Then the registration is rejected with reason "directory not found"
    And the manifest remains unchanged

  @US-01 @skip
  Scenario: Adding a duplicate project is rejected
    Given a manifest with project "nw-teams" registered at "/Users/andres/projects/nw-teams"
    When Andres attempts to add a project at "/Users/andres/projects/nw-teams"
    Then the registration is rejected with reason "already registered"
    And the manifest still contains exactly one entry for "nw-teams"

  # --- Edge / Empty State ---

  @US-01 @skip
  Scenario: Empty state shows onboarding guidance
    Given a valid project manifest with no registered projects
    When Andres views the overview dashboard
    Then the empty state shows guidance to add a first project
    And an "Add Project" action is available

  # ================================================================
  # Path Resolution (supports US-02, US-05, US-06)
  # ================================================================

  # --- Happy Path ---

  @US-02 @skip
  Scenario: Feature directory resolves from project path and feature name
    Given a project registered at "/Users/andres/projects/nw-teams"
    When the feature directory is resolved for feature "doc-viewer"
    Then the feature directory is "/Users/andres/projects/nw-teams/docs/feature/doc-viewer"

  @US-02 @skip
  Scenario: Feature roadmap path resolves correctly
    Given a project registered at "/Users/andres/projects/nw-teams"
    When the roadmap path is resolved for feature "card-redesign"
    Then the roadmap path is "/Users/andres/projects/nw-teams/docs/feature/card-redesign/roadmap.yaml"

  @US-02 @skip
  Scenario: Feature execution log path resolves correctly
    Given a project registered at "/Users/andres/projects/nw-teams"
    When the execution log path is resolved for feature "card-redesign"
    Then the execution log path is "/Users/andres/projects/nw-teams/docs/feature/card-redesign/execution-log.yaml"

  @US-02 @skip
  Scenario: Feature docs root resolves correctly
    Given a project registered at "/Users/andres/projects/nw-teams"
    When the docs root is resolved for feature "doc-viewer"
    Then the docs root is "/Users/andres/projects/nw-teams/docs/feature/doc-viewer"

  # ================================================================
  # Manifest Validation and Operations (supports US-01)
  # ================================================================

  # --- Error Path ---

  @US-01 @skip
  Scenario: Corrupted project list is rejected with diagnostic
    Given the saved project list contains corrupted data
    When the project list is loaded
    Then loading fails with a descriptive error message
    And no projects are registered from the corrupted data

  @US-01 @skip
  Scenario: First launch with no prior projects creates empty starting point
    Given Andres has never registered any projects before
    When the board app is opened for the first time
    Then an empty project list is created
    And the overview shows no registered projects

  # --- Property-Shaped ---

  @US-01 @skip @property
  Scenario: Adding then removing a project always restores original manifest
    Given any valid manifest with registered projects
    When a new project is added and then removed
    Then the manifest matches the original state exactly

  @US-01 @skip @property
  Scenario: Feature ID validation accepts only lowercase slugs
    Given any string input for a feature identifier
    When the feature identifier is validated
    Then only lowercase slugs with letters, digits, and hyphens are accepted
    And leading or trailing hyphens are rejected

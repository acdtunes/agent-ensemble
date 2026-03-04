Feature: Extended Route Parsing for Project and Feature Navigation
  As Andres, a solo developer,
  I want to navigate directly to any project, feature board, or feature docs via URL,
  so I can bookmark and share deep links to specific views.

  # ================================================================
  # US-04 / US-05 / US-06: Extended Route Parsing (8 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-04
  Scenario: Project view route is parsed from URL
    Given the URL hash is "#/projects/nw-teams"
    When the route is parsed
    Then the view is "project" for project "nw-teams"

  @US-05 @skip
  Scenario: Feature board route is parsed from URL
    Given the URL hash is "#/projects/nw-teams/features/card-redesign/board"
    When the route is parsed
    Then the view is "feature-board" for project "nw-teams" and feature "card-redesign"

  @US-06 @skip
  Scenario: Feature docs route is parsed from URL
    Given the URL hash is "#/projects/nw-teams/features/doc-viewer/docs"
    When the route is parsed
    Then the view is "feature-docs" for project "nw-teams" and feature "doc-viewer"

  @US-04 @skip
  Scenario: Overview route is parsed from empty hash
    Given the URL hash is ""
    When the route is parsed
    Then the view is "overview"

  # --- Legacy Backward Compatibility ---

  @US-04 @skip
  Scenario: Legacy board route still works
    Given the URL hash is "#/projects/nw-teams/board"
    When the route is parsed
    Then the view is "board" for project "nw-teams"

  @US-04 @skip
  Scenario: Legacy docs route still works
    Given the URL hash is "#/projects/nw-teams/docs"
    When the route is parsed
    Then the view is "docs" for project "nw-teams"

  # --- Error Path ---

  @US-04 @skip
  Scenario: Unrecognized hash falls back to overview
    Given the URL hash is "#/unknown/path/here"
    When the route is parsed
    Then the view is "overview"

  @US-05 @skip
  Scenario: Incomplete feature route falls back to overview
    Given the URL hash is "#/projects/nw-teams/features/card-redesign"
    When the route is parsed
    Then the view is "overview"

  # --- Property-Shaped ---

  @US-04 @skip @property
  Scenario: Route parsing never throws regardless of input
    Given any arbitrary string as URL hash
    When the route is parsed
    Then a valid route is always returned without error
    And unrecognized hashes always resolve to overview

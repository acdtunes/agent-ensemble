Feature: Archive and Restore Features
  As a developer using the NW Teams board
  I want to archive and restore features
  So that I can manage my feature lifecycle without losing documentation

  Background:
    Given project "alpha" is registered in the board
    And feature "auth-system" exists in docs/feature/
    And feature "user-profile" exists in docs/feature/
    And feature "old-poc" exists in docs/archive/
    And feature "abandoned" exists in docs/archive/

  # =================================================================
  # US-01: Archive a Feature
  # =================================================================

  @us-01
  Scenario: Archive existing feature successfully
    When I POST to /api/projects/alpha/features/auth-system/archive
    Then the response status is 204 No Content
    And "auth-system" is removed from active features
    And "auth-system" exists in archived features

  @us-01
  Scenario: Archive non-existent feature returns 404
    When I POST to /api/projects/alpha/features/unknown-feature/archive
    Then the response status is 404
    And the error message contains "not found"

  @us-01
  Scenario: Archive already archived feature returns 409
    When I POST to /api/projects/alpha/features/old-poc/archive
    Then the response status is 409
    And the error message contains "already archived"

  @us-01
  Scenario: Archive with invalid feature ID returns 400
    When I POST to /api/projects/alpha/features/INVALID!/archive
    Then the response status is 400

  @us-01
  Scenario: First archive creates archive directory
    Given docs/archive/ does not exist
    When I POST to /api/projects/alpha/features/auth-system/archive
    Then the response status is 204 No Content
    And docs/archive/ directory exists
    And "auth-system" exists in docs/archive/

  # =================================================================
  # US-02: View Archived Features
  # =================================================================

  @us-02
  Scenario: List archived features returns all with timestamps
    When I GET /api/projects/alpha/archive
    Then the response status is 200
    And the response contains 2 archived features
    And each archived feature has "featureId", "name", and "archivedAt"

  @us-02
  Scenario: Empty archive returns empty array
    Given no features are archived
    When I GET /api/projects/alpha/archive
    Then the response status is 200
    And the response contains 0 archived features

  @us-02
  Scenario: Unknown project returns 404
    When I GET /api/projects/unknown/archive
    Then the response status is 404

  # =================================================================
  # US-03: Restore an Archived Feature
  # =================================================================

  @us-03
  Scenario: Restore archived feature successfully
    When I POST to /api/projects/alpha/archive/old-poc/restore
    Then the response status is 204 No Content
    And "old-poc" is removed from archived features
    And "old-poc" exists in active features

  @us-03
  Scenario: Restore non-existent archived feature returns 404
    When I POST to /api/projects/alpha/archive/never-existed/restore
    Then the response status is 404
    And the error message contains "not found"

  @us-03
  Scenario: Restore conflicts with existing active feature returns 409
    Given "auth-system" exists in both active and archived
    When I POST to /api/projects/alpha/archive/auth-system/restore
    Then the response status is 409
    And the error message contains "already exists"

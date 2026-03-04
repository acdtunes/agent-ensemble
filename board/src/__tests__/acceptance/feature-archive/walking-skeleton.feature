Feature: Archive Walking Skeleton
  As a developer
  I want to verify the archive infrastructure works end-to-end
  So I can confidently build out the full feature

  Background:
    Given project "test-project" is registered in the board

  Scenario: Archive endpoint accepts valid feature and returns 204
    Given feature "my-feature" exists in docs/feature/
    When I POST to /api/projects/test-project/features/my-feature/archive
    Then the response status is 204 No Content
    And the directory docs/feature/my-feature no longer exists
    And the directory docs/archive/my-feature exists

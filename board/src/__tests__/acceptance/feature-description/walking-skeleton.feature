Feature: Feature Description Walking Skeleton
  As a developer viewing the NW Teams board
  I want to see descriptions on feature cards and board headers
  So I can quickly understand what each feature does without reading documentation

  Background:
    Given project "alpha" is registered in the board

  @walking_skeleton
  Scenario: Developer views feature card with description and sees brief summary
    Given feature "auth-system" has short description "Handles user authentication and session management"
    When I view the feature card for "auth-system"
    Then I see "Handles user authentication and session management" below the feature name

  @walking_skeleton
  Scenario: Developer views feature board and sees detailed description header
    Given feature "auth-system" has description "Provides secure authentication including login, logout, password reset, and session management. Supports OAuth2 providers and multi-factor authentication."
    When I open the feature board for "auth-system"
    Then I see the description header above the Kanban board
    And the description reads "Provides secure authentication including login, logout, password reset, and session management. Supports OAuth2 providers and multi-factor authentication."

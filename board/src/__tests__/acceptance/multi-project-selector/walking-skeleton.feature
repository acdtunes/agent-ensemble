Feature: Multi-Project Selector Walking Skeletons
  As Andres, a solo developer monitoring multi-agent deliveries across multiple projects,
  I want to register projects, browse their features, and view feature-level boards and docs,
  so I can monitor delivery progress for all my projects from a single dashboard.

  # Walking skeletons prove observable user value end-to-end.
  # Each answers: "Can Andres accomplish this goal and see the result?"

  @walking_skeleton
  Scenario: Andres registers a project and sees its features on the dashboard
    Given Andres has no projects registered
    When he registers the project at "/Users/andres/projects/karateka"
    Then the overview shows project "karateka" with 2 features
    And the project card shows aggregated progress across features
    When he clicks on project "karateka"
    Then he sees the feature list with "card-redesign" and "doc-viewer"
    And each feature card shows its delivery progress

  @walking_skeleton
  Scenario: Andres navigates from project overview to a feature board and views delivery state
    Given project "nw-teams" is registered with 3 features
    And feature "doc-viewer" has a roadmap with 5 steps and 2 completed
    When Andres navigates to the feature board for "doc-viewer" in project "nw-teams"
    Then the board shows delivery steps in their current status columns
    And the breadcrumb shows "Overview / nw-teams / doc-viewer"
    And the context dropdowns allow switching project and feature

  @walking_skeleton
  Scenario: Andres browses feature documentation scoped to a single feature
    Given project "nw-teams" is registered
    And feature "card-redesign" has documentation with folders "discuss", "design", "distill"
    When Andres navigates to the docs view for "card-redesign" in project "nw-teams"
    Then the document tree shows only files within "card-redesign"
    And the breadcrumb shows "Overview / nw-teams / card-redesign"
    When he clicks on "architecture-design.md" in the "design" folder
    Then the document content is rendered in the content panel

  @walking_skeleton
  Scenario: Andres switches between features and projects without navigating back
    Given project "nw-teams" is registered with features "card-redesign" and "doc-viewer"
    And project "karateka" is registered with feature "combat-system"
    When Andres is viewing the board for "card-redesign" in "nw-teams"
    And he selects "doc-viewer" from the feature dropdown
    Then the board updates to show "doc-viewer" delivery state
    When he selects "karateka" from the project dropdown
    Then the view updates to show "karateka" features

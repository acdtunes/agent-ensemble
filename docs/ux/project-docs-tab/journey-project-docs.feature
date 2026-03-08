Feature: Project-level documentation tab
  As a tech lead reviewing project-wide documentation,
  I want to access project docs directly from the project page via a Docs tab,
  so I can browse and read documentation without memorizing URLs or losing project context.

  Background:
    Given the "nw-teams" project exists with documentation in its docs/ directory
    And the project has features: "auth-flow", "update-ensemble", "project-docs-tab"

  # --- Happy Path ---

  Scenario: Project page displays Board and Docs tabs
    Given Carla Rivera navigates to the "nw-teams" project page
    When the page loads
    Then the header shows "Agent Ensemble" with "Board" and "Docs" tabs
    And the "Board" tab is visually active with a blue underline
    And the feature card list is displayed below the header

  Scenario: Navigating to Docs tab shows document tree
    Given Carla Rivera is on the "nw-teams" project page
    When she clicks the "Docs" tab
    Then the URL changes to "#/projects/nw-teams/docs"
    And the "Docs" tab becomes visually active
    And a document tree sidebar appears on the left side
    And the content pane shows "Select a document to view its contents"

  Scenario: Selecting a document displays its content
    Given Carla Rivera is on the "nw-teams" project Docs view
    And the document tree includes "ux/auth-flow/journey.yaml"
    When she clicks "journey.yaml" in the sidebar tree
    Then the content pane displays the rendered document content
    And the file path "docs/ux/auth-flow/journey.yaml" is shown above the content
    And a copy-path button is available next to the file path

  Scenario: Returning to feature list via Board tab
    Given Carla Rivera is viewing project docs for "nw-teams"
    When she clicks the "Board" tab
    Then the URL changes to the project board view
    And the "Board" tab becomes visually active
    And the project content is displayed

  # --- Edge Cases ---

  Scenario: Project with no documentation shows empty state
    Given Carla Rivera navigates to the "empty-project" project page
    And the project has no docs/ directory
    When she clicks the "Docs" tab
    Then the content area shows "No documentation found"
    And the "Board" tab remains clickable to return to the feature list

  Scenario: Direct URL navigation to project docs works
    Given Carla Rivera enters "#/projects/nw-teams/docs" directly in the browser
    When the page loads
    Then the project Docs view is displayed
    And the "Docs" tab is visually active
    And the document tree sidebar is shown

  # --- Error Path ---

  Scenario: Documentation tree fetch failure shows error message
    Given Carla Rivera is on the "nw-teams" project page
    And the documentation API endpoint is unavailable
    When she clicks the "Docs" tab
    Then an error message is displayed in the content area
    And the "Board" tab remains clickable for navigation back

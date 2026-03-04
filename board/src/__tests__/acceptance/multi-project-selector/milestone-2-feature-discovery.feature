Feature: Feature Discovery Within Projects
  As Andres, a solo developer,
  I want the board to automatically discover features within my registered projects,
  so I can see all active features and their delivery status without manual configuration.

  # ================================================================
  # US-02: Feature Discovery Within Projects (5 scenarios)
  # ================================================================

  # --- Happy Path ---

  @US-02
  Scenario: Features discovered from project filesystem
    Given project "nw-teams" is registered at "/Users/andres/projects/nw-teams"
    And the project has 4 feature directories: "card-redesign", "doc-viewer", "kanban-board", "multi-project-selector"
    When features are discovered for project "nw-teams"
    Then 4 features are found
    And the feature list includes "card-redesign", "doc-viewer", "kanban-board", "multi-project-selector"

  @US-02 @skip
  Scenario: Feature with roadmap reports board availability
    Given project "nw-teams" is registered
    And feature "card-redesign" has a roadmap with 7 steps
    When features are discovered for project "nw-teams"
    Then feature "card-redesign" reports board availability
    And feature "card-redesign" shows 7 total steps

  @US-02 @skip
  Scenario: Feature without roadmap is docs-only
    Given project "nw-teams" is registered
    And feature "kanban-board" has documentation but no roadmap
    When features are discovered for project "nw-teams"
    Then feature "kanban-board" does not report board availability
    And feature "kanban-board" shows 0 total steps

  # --- Error Path ---

  @US-02 @skip
  Scenario: Project without feature directory returns empty list
    Given project "empty-project" is registered at "/Users/andres/projects/empty-project"
    And the project has no "docs/feature" directory
    When features are discovered for project "empty-project"
    Then the feature list is empty
    And no error is reported

  # --- Progress Metrics ---

  @US-02 @skip
  Scenario: Feature with execution progress reports delivery metrics
    Given project "nw-teams" is registered
    And feature "card-redesign" has a roadmap with 7 steps
    And feature "card-redesign" has execution state with 3 completed, 1 in progress, and 1 failed
    When features are discovered for project "nw-teams"
    Then feature "card-redesign" shows 3 completed steps
    And feature "card-redesign" shows 1 in-progress step
    And feature "card-redesign" shows 1 failed step

  # ================================================================
  # Feature Summary Derivation (supports US-02, US-03)
  # ================================================================

  # --- Boundary ---

  @US-02 @skip
  Scenario: Feature with roadmap but no execution log shows all steps as planned
    Given a feature "new-feature" with a roadmap containing 5 steps
    And no execution log exists for "new-feature"
    When the feature summary is derived
    Then the summary shows 5 total steps with 0 completed, 0 in progress, 0 failed

  @US-02 @skip
  Scenario: Feature with no roadmap and no execution log shows empty summary
    Given a feature "docs-only-feature" with no roadmap and no execution log
    When the feature summary is derived
    Then the summary shows 0 total steps
    And board availability is not reported

  # --- Property-Shaped ---

  @US-02 @skip @property
  Scenario: Feature summary metrics always match execution state counts
    Given any feature with a roadmap and execution state
    When the feature summary is derived
    Then completed plus in-progress plus failed never exceeds total steps
    And total steps always matches the roadmap step count

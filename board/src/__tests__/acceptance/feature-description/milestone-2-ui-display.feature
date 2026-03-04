Feature: UI Display for Feature Description
  As a developer using the NW Teams board
  I want visual display of feature descriptions
  So I can understand features at a glance and in detail

  # =================================================================
  # US-01: FeatureCard displays shortDescription
  # =================================================================

  @us-01
  Scenario: FeatureCard shows short description below feature name
    Given feature "auth-system" has short description "Handles user authentication"
    When I view the feature card
    Then I see "Handles user authentication" displayed below "auth-system"
    And the description has muted styling

  @us-01
  Scenario: FeatureCard truncates long short description with ellipsis
    Given feature "payment-gateway" has short description "This is a very long description that exceeds the available space on the card and should be truncated with an ellipsis to maintain visual consistency across all feature cards in the grid layout"
    When I view the feature card
    Then the description is truncated
    And the description ends with ellipsis

  @us-01
  Scenario: FeatureCard shows nothing when short description is undefined
    Given feature "legacy-feature" has no short description
    When I view the feature card
    Then no description text appears below the feature name
    And the card layout remains consistent

  # =================================================================
  # US-02: FeatureBoardView displays description header
  # =================================================================

  @us-02
  Scenario: FeatureBoardView shows description header above Kanban board
    Given feature "auth-system" has description "Provides secure authentication including login, logout, and session management."
    When I open the feature board
    Then I see a description header between the breadcrumb and the Kanban board
    And the header contains "Provides secure authentication including login, logout, and session management."

  @us-02
  Scenario: FeatureBoardView description header has static display
    Given feature "auth-system" has description "Detailed explanation of the feature purpose and scope."
    When I open the feature board
    Then the description header is always visible
    And there is no collapse or expand control

  @us-02
  Scenario: FeatureBoardView shows nothing when description is undefined
    Given feature "legacy-feature" has no description
    When I open the feature board
    Then no description header appears
    And the Kanban board appears directly after the breadcrumb

  # =================================================================
  # US-03: Backward compatibility - existing features work
  # =================================================================

  @us-03
  Scenario: Existing feature without descriptions displays normally
    Given feature "existing-feature" has no description fields in roadmap.yaml
    When I view the feature card
    Then the card displays the feature name and progress
    And no description text is shown
    And the card behaves normally

  @us-03
  Scenario: Existing feature board without descriptions displays normally
    Given feature "existing-feature" has no description fields in roadmap.yaml
    When I open the feature board
    Then the board displays breadcrumb, dropdown, and Kanban board
    And no description header is shown
    And the board behaves normally

  # =================================================================
  # Edge cases and error paths
  # =================================================================

  @us-01
  Scenario: FeatureCard handles empty string short description
    Given feature "empty-desc" has short description ""
    When I view the feature card
    Then no description text appears below the feature name

  @us-02
  Scenario: FeatureBoardView handles empty string description
    Given feature "empty-desc" has description ""
    When I open the feature board
    Then no description header appears

  @us-01
  Scenario: FeatureCard handles whitespace-only short description
    Given feature "whitespace-desc" has short description "   "
    When I view the feature card
    Then no description text appears below the feature name

  @us-02
  Scenario: FeatureBoardView handles whitespace-only description
    Given feature "whitespace-desc" has description "   "
    When I open the feature board
    Then no description header appears

  @us-01
  Scenario: FeatureCard preserves special characters in description
    Given feature "special-chars" has short description "Handles OAuth2 & JWT tokens"
    When I view the feature card
    Then I see "Handles OAuth2 & JWT tokens" displayed correctly

  @us-02
  Scenario: FeatureBoardView preserves special characters in description
    Given feature "special-chars" has description "Supports <script> tags are escaped & quotes \"work\""
    When I open the feature board
    Then the description displays safely without script execution

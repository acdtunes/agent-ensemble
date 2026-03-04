Feature: Features Overview Page Redesign
  As a project maintainer managing multiple features,
  I want a well-organized features overview with search and filtering,
  so I can quickly find and assess feature status to prioritize my work.

  Background:
    Given the project "acme-platform" has the following features:
      | name               | hasRoadmap | totalSteps | completed | inProgress | failed |
      | auth-service       | true       | 12         | 5         | 2          | 0      |
      | payment-gateway    | true       | 8          | 3         | 1          | 0      |
      | user-dashboard     | true       | 10         | 7         | 0          | 1      |
      | billing-reports    | true       | 6          | 0         | 0          | 0      |
      | data-export        | true       | 4          | 0         | 0          | 0      |
      | notification-svc   | true       | 9          | 0         | 0          | 0      |
      | search-indexing    | true       | 3          | 0         | 0          | 0      |
      | ci-pipeline        | true       | 5          | 5         | 0          | 0      |
      | logging-setup      | true       | 3          | 3         | 0          | 0      |
      | api-documentation  | false      | 0          | 0         | 0          | 0      |
      | email-templates    | false      | 0          | 0         | 0          | 0      |
      | onboarding-flow    | false      | 0          | 0         | 0          | 0      |

  # --- US-1: Remove "Docs only" tag ---

  Scenario: Feature without roadmap shows no status tag
    When Elena Ruiz opens the features overview for "acme-platform"
    Then the card for "api-documentation" does not display a status label
    And the card for "api-documentation" does not show a progress bar
    And the card for "api-documentation" shows only its name

  Scenario: Feature with roadmap still shows status label
    When Elena Ruiz opens the features overview for "acme-platform"
    Then the card for "auth-service" displays status label "Active"
    And the card for "billing-reports" displays status label "Planned"
    And the card for "ci-pipeline" displays status label "Completed"

  # --- US-2: Narrower card width ---

  Scenario: Cards display at half their previous width on large screens
    When Elena Ruiz opens the features overview on a 1440px-wide viewport
    Then at least 6 feature cards are visible per row
    And each card displays its name, status, and progress without truncation

  Scenario: Cards stack responsively on small screens
    When Elena Ruiz opens the features overview on a 375px-wide viewport
    Then feature cards display one per row at full width

  # --- US-3: Status-grouped and alphabetical ordering ---

  Scenario: Features are grouped by status in priority order
    When Elena Ruiz opens the features overview for "acme-platform"
    Then the first group is "Active" containing 3 features
    And the second group is "Planned" containing 4 features
    And the third group is "Completed" containing 2 features
    And features without roadmaps appear after all status groups

  Scenario: Features are sorted alphabetically within each status group
    When Elena Ruiz opens the features overview for "acme-platform"
    Then within the "Active" group, features appear in this order:
      | auth-service    |
      | payment-gateway |
      | user-dashboard  |
    And within the "Planned" group, features appear in this order:
      | billing-reports  |
      | data-export      |
      | notification-svc |
      | search-indexing   |
    And within the "Completed" group, features appear in this order:
      | ci-pipeline   |
      | logging-setup |

  Scenario: Status group headers show group name and count
    When Elena Ruiz opens the features overview for "acme-platform"
    Then a group header "Active (3)" is visible above Active features
    And a group header "Planned (4)" is visible above Planned features
    And a group header "Completed (2)" is visible above Completed features

  # --- US-4: Search by feature name ---

  Scenario: Typing in search box filters features by name in real-time
    Given Elena Ruiz is viewing the features overview for "acme-platform"
    When she types "pay" in the search box
    Then only "payment-gateway" is visible
    And all other feature cards are hidden
    And group headers update to show filtered counts

  Scenario: Search is case-insensitive
    Given Elena Ruiz is viewing the features overview for "acme-platform"
    When she types "Auth" in the search box
    Then "auth-service" is visible

  Scenario: Clearing search restores all features
    Given Elena Ruiz has typed "pay" in the search box
    When she clears the search box
    Then all 12 features are visible again in their status-grouped order

  Scenario: Search with no results shows empty state
    Given Elena Ruiz is viewing the features overview for "acme-platform"
    When she types "zzz-nonexistent" in the search box
    Then no feature cards are visible
    And a message "No features match your search" is displayed

  # --- US-5: Filter by status ---

  Scenario: Selecting status filter shows only that group
    Given Elena Ruiz is viewing the features overview for "acme-platform"
    When she selects the "Active" status filter
    Then only Active features are visible: "auth-service", "payment-gateway", "user-dashboard"
    And the "Active" filter button appears selected
    And features from Planned, Completed, and no-roadmap groups are hidden

  Scenario: Selecting "All" status filter shows all features
    Given Elena Ruiz has the "Active" status filter selected
    When she selects the "All" filter
    Then all 12 features are visible in status-grouped order

  Scenario: Search and status filter work together
    Given Elena Ruiz has selected the "Planned" status filter
    When she types "data" in the search box
    Then only "data-export" is visible
    And features in other status groups remain hidden

  Scenario: Status filter shows count per status
    When Elena Ruiz opens the features overview for "acme-platform"
    Then the status filter shows "All (12)", "Active (3)", "Planned (4)", "Completed (2)"

Feature: Review History Persistence
  As a project owner running parallel agent team delivery,
  I want reviewer feedback persisted in roadmap.yaml as structured review_history entries,
  so I can see what happened during each review cycle from the board UI.

  Background:
    Given a roadmap file at "docs/feature/auth-feature/roadmap.yaml"
    And a state file at ".nw-teams/state.yaml"
    And step "01-02" exists with status "review" and review_attempts 1

  # Happy path -- approval with feedback
  Scenario: complete-step records approved review_history entry
    When the Lead runs complete-step for step "01-02" with outcome "approved" and feedback "All issues addressed. Authentication flow is correct."
    Then roadmap.yaml step "01-02" has status "approved"
    And roadmap.yaml step "01-02" has a review_history entry with:
      | cycle | outcome  | feedback                                              |
      | 1     | approved | All issues addressed. Authentication flow is correct. |
    And the review_history entry has a valid ISO 8601 timestamp
    And state.yaml step "01-02" has status "approved"

  # Happy path -- rejection with feedback
  Scenario: transition records rejected review_history entry
    When the Lead runs transition for step "01-02" to status "in_progress" with outcome "rejected" and feedback "Missing error handling for expired tokens."
    Then roadmap.yaml step "01-02" has status "in_progress"
    And roadmap.yaml step "01-02" has a review_history entry with:
      | cycle | outcome  | feedback                                      |
      | 1     | rejected | Missing error handling for expired tokens.     |
    And the review_history entry has a valid ISO 8601 timestamp

  # Multi-cycle accumulation
  Scenario: multiple review cycles accumulate in review_history
    Given step "01-02" was previously rejected with feedback "Missing error handling for expired tokens." at cycle 1
    And step "01-02" has been re-submitted with review_attempts 2
    When the Lead runs complete-step for step "01-02" with outcome "approved" and feedback "All issues addressed. Ready to merge."
    Then roadmap.yaml step "01-02" review_history has 2 entries
    And review_history entry at cycle 1 has outcome "rejected"
    And review_history entry at cycle 2 has outcome "approved"

  # Backward compatibility -- no outcome flag
  Scenario: transition without outcome flag preserves existing behavior
    When the Lead runs transition for step "01-02" to status "in_progress" without outcome or feedback flags
    Then roadmap.yaml step "01-02" has status "in_progress"
    And roadmap.yaml step "01-02" has no review_history field
    And review_attempts is still 1

  # Backward compatibility -- complete-step without outcome flag
  Scenario: complete-step without outcome flag preserves existing behavior
    When the Lead runs complete-step for step "01-02" without outcome or feedback flags
    Then roadmap.yaml step "01-02" has status "approved"
    And roadmap.yaml step "01-02" has no review_history field

  # Validation -- invalid outcome
  Scenario: CLI rejects invalid outcome value
    When the Lead runs transition for step "01-02" to status "in_progress" with outcome "maybe" and feedback "not sure"
    Then the CLI prints "Error: invalid outcome 'maybe'. Valid: approved, rejected"
    And the CLI exits with code 2
    And roadmap.yaml step "01-02" is unchanged

  # Edge case -- outcome without feedback
  Scenario: outcome provided without feedback records empty feedback string
    When the Lead runs complete-step for step "01-02" with outcome "approved" and no feedback flag
    Then roadmap.yaml step "01-02" has a review_history entry with:
      | cycle | outcome  | feedback |
      | 1     | approved |          |

  # Integration -- board parser accepts CLI-written entries
  Scenario: board parser validates review_history written by CLI
    Given the CLI has written a review_history entry to roadmap.yaml for step "01-02"
    When the board parser reads the roadmap file
    Then the parser returns a valid RoadmapStep with review_history containing:
      | field     | type   |
      | cycle     | number |
      | timestamp | string |
      | outcome   | string |
      | feedback  | string |

  # State file consistency
  Scenario: review_history is written to both state.yaml and roadmap.yaml
    When the Lead runs transition for step "01-02" to status "in_progress" with outcome "rejected" and feedback "Tests missing"
    Then state.yaml step "01-02" has a review_history entry matching roadmap.yaml

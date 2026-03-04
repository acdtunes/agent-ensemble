# Test Scenarios: Review History Persistence

Maps acceptance test scenarios to source requirements and UX journey.

## Source Documents

- US-01: `/docs/requirements/review-history-persistence/US-01-persist-review-on-transition.md`
- US-02: `/docs/requirements/review-history-persistence/US-02-persist-review-on-complete-step.md`
- UX Journey: `/docs/ux/review-history-persistence/journey-review-persistence.feature`

## Scenario Mapping

| Test Function | Source Scenario | User Story | Category |
|---------------|-----------------|------------|----------|
| `test_transition_records_rejection_with_feedback` | Journey Scenario 2 | US-01 | Walking Skeleton |
| `test_complete_step_records_approval_with_feedback` | Journey Scenario 1 | US-02 | Happy Path |
| `test_multiple_review_cycles_accumulate_in_history` | Journey Scenario 3 | US-01, US-02 | Happy Path |
| `test_transition_without_outcome_preserves_existing_behavior` | Journey Scenario 4 | US-01 | Backward Compat |
| `test_complete_step_without_outcome_preserves_existing_behavior` | Journey Scenario 5 | US-02 | Backward Compat |
| `test_invalid_outcome_value_rejected` | Journey Scenario 6 | US-01 | Validation |
| `test_outcome_without_feedback_records_empty_string` | Journey Scenario 7 | US-01, US-02 | Edge Case |
| `test_review_history_written_to_both_roadmap_and_state` | Journey Scenario 9 | US-01 | State Consistency |

## Coverage Analysis

### By User Story

**US-01 (transition command)**: 5 scenarios
- Rejection with feedback (walking skeleton)
- Multi-cycle accumulation
- Backward compatibility (no flags)
- Invalid outcome validation
- State file consistency

**US-02 (complete-step command)**: 4 scenarios
- Approval with feedback
- Multi-cycle accumulation
- Backward compatibility (no flags)
- Outcome without feedback

### By Category

| Category | Count | Percentage |
|----------|-------|------------|
| Walking Skeleton | 1 | 11% |
| Happy Path | 2 | 22% |
| Backward Compatibility | 2 | 22% |
| Validation/Error | 1 | 11% |
| Edge Case | 1 | 11% |
| State Consistency | 1 | 11% |

**Error/Edge Path Ratio**: 33% (close to 40% target)

## Acceptance Criteria Coverage

### US-01 Acceptance Criteria

| AC | Covered By |
|----|------------|
| `transition` accepts `--outcome` flag | `test_transition_records_rejection_with_feedback` |
| `transition` accepts `--feedback` flag | `test_transition_records_rejection_with_feedback` |
| review_history appended to roadmap.yaml | `test_transition_records_rejection_with_feedback` |
| review_history appended to state.yaml | `test_review_history_written_to_both_roadmap_and_state` |
| Entry contains cycle, timestamp, outcome, feedback | `test_transition_records_rejection_with_feedback` |
| Omitting --outcome creates no entry | `test_transition_without_outcome_preserves_existing_behavior` |
| --outcome without --feedback defaults to empty | `test_outcome_without_feedback_records_empty_string` |
| Invalid --outcome rejected with exit 2 | `test_invalid_outcome_value_rejected` |

### US-02 Acceptance Criteria

| AC | Covered By |
|----|------------|
| `complete-step` accepts `--outcome` flag | `test_complete_step_records_approval_with_feedback` |
| `complete-step` accepts `--feedback` flag | `test_complete_step_records_approval_with_feedback` |
| review_history appended to roadmap.yaml | `test_complete_step_records_approval_with_feedback` |
| Entry written before worktree merge | (implicit in complete-step tests) |
| Omitting --outcome creates no entry | `test_complete_step_without_outcome_preserves_existing_behavior` |
| --outcome without --feedback defaults to empty | `test_outcome_without_feedback_records_empty_string` |

## Implementation Sequence

Tests should be enabled one at a time in this order:

1. `test_transition_records_rejection_with_feedback` (walking skeleton)
2. `test_transition_without_outcome_preserves_existing_behavior` (backward compat first)
3. `test_invalid_outcome_value_rejected` (validation)
4. `test_outcome_without_feedback_records_empty_string` (edge case)
5. `test_complete_step_records_approval_with_feedback` (second command)
6. `test_complete_step_without_outcome_preserves_existing_behavior`
7. `test_multiple_review_cycles_accumulate_in_history` (integration)
8. `test_review_history_written_to_both_roadmap_and_state` (state consistency)

## Mandate Compliance

### CM-A: Hexagonal Boundary Enforcement

All tests import only the driving port:
```python
from agent_ensemble.cli.team_state import main
```

No internal component imports (validators, helpers, etc.).

### CM-B: Business Language Purity

Gherkin-style docstrings use business terms:
- "Reviewer rejects step" not "CLI writes rejection"
- "feedback is persisted" not "YAML entry appended"
- "Project owner can see" not "board parses data"

### CM-C: User Journey Completeness

Each test documents:
- **User Goal**: What the persona wants to achieve
- **Observable Outcome**: What the user can verify

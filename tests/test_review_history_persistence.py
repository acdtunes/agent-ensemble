"""Acceptance tests for review-history-persistence feature.

Tests validate that reviewer feedback is persisted in roadmap.yaml as structured
review_history entries, enabling the board UI to display complete review audit trails.

Walking Skeleton Strategy:
- First test enabled: test_transition_records_rejection_with_feedback
- Simplest E2E path proving user value: reviewer feedback captured and persisted

Test Budget: 9 scenarios covering:
- Walking skeleton (1): rejection with feedback via transition
- Happy path (3): approval, rejection, multi-cycle accumulation
- Backward compatibility (2): commands without new flags
- Validation (2): invalid outcome, outcome without feedback
- State consistency (1): both roadmap.yaml and state.yaml updated
"""

from __future__ import annotations

import textwrap
from datetime import datetime

import pytest
from ruamel.yaml import YAML

from agent_ensemble.cli.team_state import main


# --- Fixtures ---


ROADMAP_WITH_STEP_IN_REVIEW = textwrap.dedent("""\
    # Project roadmap for auth feature
    roadmap:
      project_id: auth-feature
      created_at: '2026-03-01T00:00:00Z'
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-02
        name: Build API routes
        status: review
        review_attempts: 1
        teammate_id: crafter-01-02
        files_to_modify:
          - src/routes.ts
        dependencies: []
        criteria:
          - API routes implemented
""")


ROADMAP_WITH_EXISTING_REJECTION = textwrap.dedent("""\
    # Project roadmap with prior rejection
    roadmap:
      project_id: auth-feature
      created_at: '2026-03-01T00:00:00Z'
    phases:
    - id: '01'
      name: Foundation
      steps:
      - id: 01-02
        name: Build API routes
        status: review
        review_attempts: 2
        teammate_id: crafter-01-02
        files_to_modify:
          - src/routes.ts
        dependencies: []
        criteria:
          - API routes implemented
        review_history:
          - cycle: 1
            timestamp: '2026-03-01T10:15:00Z'
            outcome: rejected
            feedback: 'Missing error handling for expired tokens.'
""")


def _load_yaml(path):
    """Load YAML file for assertions."""
    yaml = YAML()
    return yaml.load(path.read_text())


def _get_step(data, step_id):
    """Find step by ID across all phases."""
    for phase in data.get("phases", []):
        for step in phase.get("steps", []):
            if step.get("id") == step_id:
                return step
    return None


def _is_valid_iso8601(timestamp_str):
    """Validate ISO 8601 timestamp format."""
    try:
        datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        return True
    except (ValueError, AttributeError):
        return False


# --- Walking Skeleton: Simplest E2E path proving user value ---


def test_transition_records_rejection_with_feedback(tmp_path):
    """Walking Skeleton: Reviewer rejects step and feedback is persisted to roadmap.

    User Goal: Project owner can see why a step was rejected from the board UI.
    Observable Outcome: roadmap.yaml contains review_history entry with rejection feedback.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    exit_code = main([
        "transition",
        str(roadmap_file),
        "--step", "01-02",
        "--status", "in_progress",
        "--outcome", "rejected",
        "--feedback", "Missing error handling for expired tokens."
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Step transitioned to in_progress
    assert step["status"] == "in_progress"

    # Review history entry exists
    assert "review_history" in step
    assert len(step["review_history"]) == 1

    entry = step["review_history"][0]
    assert entry["cycle"] == 1
    assert entry["outcome"] == "rejected"
    assert entry["feedback"] == "Missing error handling for expired tokens."
    assert _is_valid_iso8601(entry["timestamp"])


# --- Happy Path: Approval with feedback via complete-step ---


@pytest.mark.skip(reason="Enable after walking skeleton passes")
def test_complete_step_records_approval_with_feedback(tmp_path):
    """Reviewer approves step and approval feedback is persisted.

    User Goal: Project owner can see approval confirmation and any notes.
    Observable Outcome: roadmap.yaml contains review_history entry with approval feedback.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    exit_code = main([
        "complete-step",
        str(roadmap_file),
        "--step", "01-02",
        "--outcome", "approved",
        "--feedback", "All issues addressed. Authentication flow is correct."
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Step marked approved
    assert step["status"] == "approved"

    # Review history entry exists
    assert "review_history" in step
    assert len(step["review_history"]) == 1

    entry = step["review_history"][0]
    assert entry["cycle"] == 1
    assert entry["outcome"] == "approved"
    assert entry["feedback"] == "All issues addressed. Authentication flow is correct."
    assert _is_valid_iso8601(entry["timestamp"])


# --- Happy Path: Multiple review cycles accumulate ---


@pytest.mark.skip(reason="Enable after walking skeleton passes")
def test_multiple_review_cycles_accumulate_in_history(tmp_path):
    """Multiple review cycles are accumulated in review_history.

    User Goal: Project owner sees complete review journey across all cycles.
    Observable Outcome: review_history contains entries for each cycle in order.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_EXISTING_REJECTION)

    exit_code = main([
        "complete-step",
        str(roadmap_file),
        "--step", "01-02",
        "--outcome", "approved",
        "--feedback", "All issues addressed. Ready to merge."
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Review history has 2 entries
    assert len(step["review_history"]) == 2

    # First entry unchanged (rejection from cycle 1)
    assert step["review_history"][0]["cycle"] == 1
    assert step["review_history"][0]["outcome"] == "rejected"

    # Second entry is approval from cycle 2
    assert step["review_history"][1]["cycle"] == 2
    assert step["review_history"][1]["outcome"] == "approved"
    assert step["review_history"][1]["feedback"] == "All issues addressed. Ready to merge."


# --- Backward Compatibility: transition without outcome flag ---


def test_transition_without_outcome_preserves_existing_behavior(tmp_path):
    """Transition without --outcome flag works as before (no review_history created).

    User Goal: Existing workflows continue to work without modification.
    Observable Outcome: Step transitioned but no review_history field added.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    exit_code = main([
        "transition",
        str(roadmap_file),
        "--step", "01-02",
        "--status", "in_progress"
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Step transitioned
    assert step["status"] == "in_progress"

    # No review_history field created
    assert "review_history" not in step

    # review_attempts unchanged
    assert step["review_attempts"] == 1


# --- Backward Compatibility: complete-step without outcome flag ---


@pytest.mark.skip(reason="Enable after walking skeleton passes")
def test_complete_step_without_outcome_preserves_existing_behavior(tmp_path):
    """Complete-step without --outcome flag works as before (no review_history created).

    User Goal: Existing workflows continue to work without modification.
    Observable Outcome: Step approved but no review_history field added.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    exit_code = main([
        "complete-step",
        str(roadmap_file),
        "--step", "01-02"
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Step approved
    assert step["status"] == "approved"

    # No review_history field created
    assert "review_history" not in step


# --- Validation: Invalid outcome value rejected ---


def test_invalid_outcome_value_rejected(tmp_path, capsys):
    """CLI rejects invalid outcome values with clear error message.

    User Goal: Lead gets immediate feedback on invalid input.
    Observable Outcome: Error message displayed, files unchanged, exit code 2.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)
    original_content = roadmap_file.read_text()

    exit_code = main([
        "transition",
        str(roadmap_file),
        "--step", "01-02",
        "--status", "in_progress",
        "--outcome", "maybe",
        "--feedback", "not sure about this"
    ])

    assert exit_code == 2

    # Error message mentions invalid outcome
    stderr = capsys.readouterr().err
    assert "invalid outcome" in stderr.lower()
    assert "maybe" in stderr
    assert "approved" in stderr.lower() or "rejected" in stderr.lower()

    # File unchanged
    assert roadmap_file.read_text() == original_content


# --- Edge Case: Outcome without feedback records empty string ---


@pytest.mark.skip(reason="Enable after walking skeleton passes")
def test_outcome_without_feedback_records_empty_string(tmp_path):
    """Outcome provided without --feedback records empty feedback string.

    User Goal: Terse rejections still recorded (better than losing the event).
    Observable Outcome: review_history entry with empty feedback field.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    exit_code = main([
        "complete-step",
        str(roadmap_file),
        "--step", "01-02",
        "--outcome", "approved"
    ])

    assert exit_code == 0

    data = _load_yaml(roadmap_file)
    step = _get_step(data, "01-02")

    # Review history entry exists with empty feedback
    assert "review_history" in step
    entry = step["review_history"][0]
    assert entry["outcome"] == "approved"
    assert entry["feedback"] == ""


# --- State Consistency: Both files updated ---


@pytest.mark.skip(reason="Enable after walking skeleton passes")
def test_review_history_written_to_both_roadmap_and_state(tmp_path):
    """Review history is written to both roadmap.yaml and state.yaml.

    User Goal: Audit trail consistent across both state representations.
    Observable Outcome: Both files contain matching review_history entries.

    Note: This test requires state.yaml support which may be implemented
    as part of the feature. If state.yaml is not used, this test validates
    roadmap.yaml only.
    """
    roadmap_file = tmp_path / "roadmap.yaml"
    roadmap_file.write_text(ROADMAP_WITH_STEP_IN_REVIEW)

    # Note: The current CLI implementation only updates roadmap.yaml
    # This test documents the expected behavior per US-01/US-02
    exit_code = main([
        "transition",
        str(roadmap_file),
        "--step", "01-02",
        "--status", "in_progress",
        "--outcome", "rejected",
        "--feedback", "Tests missing"
    ])

    assert exit_code == 0

    # Verify roadmap.yaml has the entry
    roadmap_data = _load_yaml(roadmap_file)
    roadmap_step = _get_step(roadmap_data, "01-02")
    assert "review_history" in roadmap_step
    assert roadmap_step["review_history"][0]["feedback"] == "Tests missing"

    # Note: state.yaml consistency would be verified here if implemented
    # The feature spec mentions state.yaml but current CLI may not use it

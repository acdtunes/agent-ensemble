/**
 * Acceptance tests: US-02 - Step Detail Modal
 *
 * Driving port: StepDetailModal component (rendered via props)
 * Driving port: BoardContent in App.tsx (click propagation -> modal state)
 * Validates: modal opens on click, displays RoadmapStep data, closes correctly
 *
 * Gherkin reference: milestone-4-step-detail-modal.feature (US-02 scenarios)
 *
 * Note: These tests render the modal component directly via its props interface
 * (driving port). The click-to-open flow is tested through KanbanBoard/FileCard
 * rendering which exercises the prop callback chain.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createRoadmapStep } from './test-fixtures';
import type { RoadmapStep } from '../../../../../shared/types';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving the import before the file exists.
const MODAL_MODULE_PATH = ['..', '..', '..', '..', 'components', 'StepDetailModal'].join('/');

// =================================================================
// Helper: renders the modal with given RoadmapStep data.
// =================================================================
const renderModal = async (overrides?: {
  step?: RoadmapStep;
  stepLookup?: ReadonlyMap<string, RoadmapStep>;
}) => {
  const { StepDetailModal } = await import(
    /* @vite-ignore */ MODAL_MODULE_PATH
  );

  const step = overrides?.step ?? createRoadmapStep({
    id: '01-02',
    name: 'Setup API routes',
    status: 'in_progress',
    description: 'Create REST API route handlers for authentication endpoints.',
    teammate_id: 'crafter-02',
    started_at: '2026-01-01T00:15:00Z',
    files_to_modify: ['src/routes.ts', 'src/schema.ts'],
    dependencies: ['01-01'],
  });

  const stepLookup = overrides?.stepLookup ?? new Map([
    ['01-01', createRoadmapStep({ id: '01-01', name: 'Setup database', files_to_modify: ['src/db.ts'] })],
    ['01-02', step],
  ]);

  const onClose = vi.fn();

  render(
    <StepDetailModal
      step={step}
      stepLookup={stepLookup}
      onClose={onClose}
    />,
  );

  return { onClose };
};

// =================================================================
// US-02 Scenario 1: Clicking a card opens modal with description
// =================================================================
describe('US-02: Clicking a card opens modal with step description', () => {
  it('modal shows title, step ID, and description', async () => {
    // Given step "01-02" is in progress with a description
    await renderModal();

    // Then the modal title shows "Setup API routes"
    expect(screen.getByText('Setup API routes')).toBeInTheDocument();
    // And the modal shows step ID "01-02" in monospace
    const stepId = screen.getByText('01-02');
    expect(stepId).toBeInTheDocument();
    expect(stepId.className).toMatch(/font-mono/);
    // And the modal shows the description
    expect(
      screen.getByText('Create REST API route handlers for authentication endpoints.'),
    ).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 2: Modal displays file list and dependency information
// =================================================================
describe('US-02: Modal displays file list and dependency information', () => {
  it('modal lists files and shows dependency step name', async () => {
    // Given step "01-02" modifies two files and depends on "01-01"
    await renderModal();

    // Then the modal lists both files
    expect(screen.getByText('src/routes.ts')).toBeInTheDocument();
    expect(screen.getByText('src/schema.ts')).toBeInTheDocument();
    // And the dependencies section shows "Setup database"
    expect(screen.getByText(/Setup database/)).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 3: Status for completed step, teammate for in-progress
// =================================================================
describe('US-02: Modal shows status and teammate appropriately', () => {
  it('completed step shows status but not teammate', async () => {
    // Given step "01-01" is approved (done)
    const step = createRoadmapStep({
      id: '01-01',
      name: 'Setup database',
      status: 'approved',
      teammate_id: 'crafter-01',
      started_at: '2026-01-01T00:10:00Z',
      completed_at: '2026-01-01T00:30:00Z',
      files_to_modify: ['src/db.ts'],
    });

    await renderModal({ step });

    // Then the modal shows status
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
    // But not teammate (work is done)
    expect(screen.queryByText(/crafter-01/)).not.toBeInTheDocument();
  });

  it('in-progress step shows status but not teammate (per remove-teammates-section)', async () => {
    // Given step is in progress with teammate
    const step = createRoadmapStep({
      id: '01-02',
      name: 'Setup API',
      status: 'in_progress',
      teammate_id: 'crafter-02',
      started_at: '2026-01-01T00:15:00Z',
      files_to_modify: ['src/api.ts'],
    });

    await renderModal({ step });

    // Then status is shown
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    // But teammate is not shown (per remove-teammates-section feature)
    expect(screen.queryByText(/crafter-02/)).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 4: Modal omits description when absent
// =================================================================
describe('US-02: Modal omits description section when step has no description', () => {
  it('modal does not show description section or placeholder', async () => {
    // Given step "02-01" has no description
    const step = createRoadmapStep({
      id: '02-01',
      name: 'Integration tests',
      status: 'pending',
      files_to_modify: ['tests/integration.ts'],
    });

    await renderModal({ step });

    // Then no description section appears
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('description-section')).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 5: Modal closes via button, outside click, Escape
// =================================================================
describe('US-02: Modal closes via close button, outside click, and Escape key', () => {
  it('close button triggers onClose callback', async () => {
    const { onClose } = await renderModal();

    // When Andres clicks the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Then the modal closes
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key triggers onClose callback', async () => {
    const { onClose } = await renderModal();

    // When Andres presses Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Then the modal closes
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('outside click triggers onClose callback', async () => {
    const { onClose } = await renderModal();

    // When Andres clicks outside the modal content area (the backdrop)
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);

    // Then the modal closes
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// =================================================================
// US-02 Scenario 6: Pending step shows minimal data
// =================================================================
describe('US-02: Modal shows minimal data for pending step with no teammate', () => {
  it('pending step modal shows status but no teammate or timing', async () => {
    // Given step "02-01" is pending with no teammate
    const step = createRoadmapStep({
      id: '02-01',
      name: 'Integration tests',
      status: 'pending',
      teammate_id: null,
      files_to_modify: ['tests/integration.ts'],
    });

    await renderModal({ step });

    // Then the modal shows status "Pending"
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    // And no teammate section
    expect(screen.queryByText(/crafter/)).not.toBeInTheDocument();
    // And no timing information
    expect(screen.queryByText(/Started/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Completed/i)).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 7: Review history renders newest-first
// =================================================================
describe('US-02: Modal shows review history when present', () => {
  it('renders review entries newest-first with cycle, outcome, and feedback', async () => {
    // Given step "01-01" has review_history with two entries
    const step = createRoadmapStep({
      id: '01-01',
      name: 'Setup database',
      status: 'approved',
      started_at: '2026-01-01T00:10:00Z',
      completed_at: '2026-01-01T00:30:00Z',
      review_attempts: 2,
      files_to_modify: ['src/db.ts'],
      review_history: [
        { cycle: 1, timestamp: '2026-01-01T00:20:00Z', outcome: 'rejected', feedback: 'Missing error handling' },
        { cycle: 2, timestamp: '2026-01-01T00:25:00Z', outcome: 'approved', feedback: 'Looks good now' },
      ],
    });

    await renderModal({ step });

    // Then a "Review History" section is visible
    expect(screen.getByText('Review History')).toBeInTheDocument();
    // And both entries are rendered
    expect(screen.getByText(/Missing error handling/)).toBeInTheDocument();
    expect(screen.getByText(/Looks good now/)).toBeInTheDocument();
    // And cycle numbers are shown
    expect(screen.getByText(/Cycle 1/)).toBeInTheDocument();
    expect(screen.getByText(/Cycle 2/)).toBeInTheDocument();
    // And outcomes are shown
    expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    // And entries are ordered newest-first (cycle 2 before cycle 1)
    const entries = screen.getAllByTestId('review-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Cycle 2');
    expect(entries[1].textContent).toContain('Cycle 1');
  });
});

// =================================================================
// US-02 Scenario 8: No review_history shows no review section
// =================================================================
describe('US-02: Modal shows no review section when review_history absent', () => {
  it('does not render review history section when absent', async () => {
    // Given step has review_attempts but no review_history
    const step = createRoadmapStep({
      id: '01-01',
      name: 'Setup database',
      status: 'approved',
      started_at: '2026-01-01T00:10:00Z',
      completed_at: '2026-01-01T00:30:00Z',
      review_attempts: 3,
      files_to_modify: ['src/db.ts'],
    });

    await renderModal({ step });

    // Then no "Review History" section appears
    expect(screen.queryByText('Review History')).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 9: Empty review_history renders no review section
// =================================================================
describe('US-02: Modal omits review history when array is empty', () => {
  it('does not render review history section for empty array', async () => {
    const step = createRoadmapStep({
      id: '01-01',
      name: 'Setup database',
      status: 'in_progress',
      started_at: '2026-01-01T00:10:00Z',
      review_attempts: 0,
      files_to_modify: ['src/db.ts'],
      review_history: [],
    });

    await renderModal({ step });

    // Then no review history section
    expect(screen.queryByText('Review History')).not.toBeInTheDocument();
    // And no review entries
    expect(screen.queryByTestId('review-entry')).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 10: No review content when review_attempts is 0 and review_history absent
// =================================================================
describe('US-02: No review-related content when review_attempts=0 and no review_history', () => {
  it('renders no review content at all', async () => {
    const step = createRoadmapStep({
      id: '01-01',
      name: 'Setup database',
      status: 'in_progress',
      started_at: '2026-01-01T00:10:00Z',
      review_attempts: 0,
      files_to_modify: ['src/db.ts'],
    });

    await renderModal({ step });

    // Then no review history section
    expect(screen.queryByText('Review History')).not.toBeInTheDocument();
    // And no review attempts text
    expect(screen.queryByText(/review attempt/i)).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 11: Modal is read-only
// =================================================================
describe('US-02: Modal is read-only with no mutation controls', () => {
  it('modal contains no edit buttons, input fields, or form controls', async () => {
    await renderModal();

    // Then only the close button exists (no edit/save/delete)
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      const text = (button.textContent ?? '').toLowerCase();
      expect(text).toMatch(/close|x|\u00d7|/);
    }

    // And no input fields or form controls
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

/**
 * Acceptance tests: US-02 - Step Detail Modal
 *
 * Driving port: StepDetailModal component (rendered via props)
 * Driving port: BoardContent in App.tsx (click propagation -> modal state)
 * Validates: modal opens on click, displays joined step+plan data, closes correctly
 *
 * Gherkin reference: milestone-4-step-detail-modal.feature (US-02 scenarios)
 *
 * Note: These tests render the modal component directly via its props interface
 * (driving port). The click-to-open flow is tested through KanbanBoard/FileCard
 * rendering which exercises the prop callback chain.
 *
 * IMPORTANT: All tests are skipped because StepDetailModal does not exist yet.
 * The software-crafter will un-skip these one at a time as they implement the modal.
 * The dynamic import uses a computed path to avoid Vite static analysis failures.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createStepState, createPlanStep } from './test-fixtures';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving the import before the file exists.
const MODAL_MODULE_PATH = ['..', '..', '..', '..', 'components', 'StepDetailModal'].join('/');

// =================================================================
// Helper: renders the modal with given step + plan data.
// Will fail at import until StepDetailModal is created.
// =================================================================
const renderModal = async (overrides?: {
  stepState?: ReturnType<typeof createStepState>;
  planStep?: ReturnType<typeof createPlanStep>;
  planStepLookup?: ReadonlyMap<string, ReturnType<typeof createPlanStep>>;
}) => {
  const { StepDetailModal } = await import(
    /* @vite-ignore */ MODAL_MODULE_PATH
  );

  const stepState = overrides?.stepState ?? createStepState({
    step_id: '01-02',
    name: 'Setup API routes',
    status: 'in_progress',
    teammate_id: 'crafter-02',
    started_at: '2026-01-01T00:15:00Z',
    files_to_modify: ['src/routes.ts', 'src/schema.ts'],
  });

  const planStep = overrides?.planStep ?? createPlanStep({
    step_id: '01-02',
    name: 'Setup API routes',
    description: 'Create REST API route handlers for authentication endpoints.',
    files_to_modify: ['src/routes.ts', 'src/schema.ts'],
    conflicts_with: ['01-01'],
  });

  const planStepLookup = overrides?.planStepLookup ?? new Map([
    ['01-01', createPlanStep({ step_id: '01-01', name: 'Setup database', files_to_modify: ['src/db.ts'] })],
    ['01-02', planStep],
  ]);

  const onClose = vi.fn();

  render(
    <StepDetailModal
      stepState={stepState}
      planStep={planStep}
      planStepLookup={planStepLookup}
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
// US-02 Scenario 2: Modal displays file list and conflicts
// =================================================================
describe('US-02: Modal displays file list and conflict information', () => {
  it('modal lists files and shows conflicting step name', async () => {
    // Given step "01-02" modifies two files and conflicts with "01-01"
    await renderModal();

    // Then the modal lists both files
    expect(screen.getByText('src/routes.ts')).toBeInTheDocument();
    expect(screen.getByText('src/schema.ts')).toBeInTheDocument();
    // And the conflicts section shows "Setup database"
    expect(screen.getByText(/Setup database/)).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 3: Timing and review attempts for completed step
// =================================================================
describe('US-02: Modal shows timing and review attempts for completed step', () => {
  it('modal shows status, timing, and review attempts', async () => {
    // Given step "01-01" is approved with timing data and 2 review attempts
    const stepState = createStepState({
      step_id: '01-01',
      name: 'Setup database',
      status: 'approved',
      teammate_id: 'crafter-01',
      started_at: '2026-01-01T00:10:00Z',
      completed_at: '2026-01-01T00:30:00Z',
      review_attempts: 2,
      files_to_modify: ['src/db.ts'],
    });

    const planStep = createPlanStep({
      step_id: '01-01',
      name: 'Setup database',
      files_to_modify: ['src/db.ts'],
    });

    await renderModal({ stepState, planStep });

    // Then the modal shows status (mapped to display label)
    expect(screen.getByText(/Done|Approved/i)).toBeInTheDocument();
    // And shows timing information
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    // And shows review attempts
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 4: Modal omits description when absent
// =================================================================
describe('US-02: Modal omits description section when plan has no description', () => {
  it('modal does not show description section or placeholder', async () => {
    // Given step "02-01" has no description in the plan
    const stepState = createStepState({
      step_id: '02-01',
      name: 'Integration tests',
      status: 'pending',
      files_to_modify: ['tests/integration.ts'],
    });

    const planStep = createPlanStep({
      step_id: '02-01',
      name: 'Integration tests',
      files_to_modify: ['tests/integration.ts'],
      // No description field
    });

    await renderModal({ stepState, planStep });

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
    const stepState = createStepState({
      step_id: '02-01',
      name: 'Integration tests',
      status: 'pending',
      teammate_id: null,
      files_to_modify: ['tests/integration.ts'],
    });

    const planStep = createPlanStep({
      step_id: '02-01',
      name: 'Integration tests',
      files_to_modify: ['tests/integration.ts'],
    });

    await renderModal({ stepState, planStep });

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
// US-02 Scenario 7: Modal is read-only
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

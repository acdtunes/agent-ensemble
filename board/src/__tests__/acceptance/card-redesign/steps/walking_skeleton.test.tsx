/**
 * Walking Skeleton Acceptance Tests: Card Redesign
 *
 * These tests prove observable user value end-to-end.
 * Each answers: "Can Andres accomplish this goal and see the result?"
 *
 * Driving ports exercised:
 *   - FileCard component (rendered via props)
 *   - ProgressHeader component (rendered via props)
 *   - StepDetailModal component (rendered via props, once created)
 *
 * Gherkin reference: walking-skeleton.feature
 *
 * Walking skeletons validate the full integration across user stories (US-01
 * through US-05). They were enabled after all focused scenarios passed.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FileCard } from '../../../../components/FileCard';
import { ProgressHeader } from '../../../../components/ProgressHeader';
import {
  createFileCardData,
  createSummary,
  createStepState,
  createPlanStep,
} from './test-fixtures';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving the import before the file exists.
const MODAL_MODULE_PATH = ['..', '..', '..', '..', 'components', 'StepDetailModal'].join('/');

// =================================================================
// Walking Skeleton 1: Andres identifies a task at a glance
// and sees who is working on it
// =================================================================
describe('Walking Skeleton: Andres identifies a task and sees the assigned teammate', () => {
  it('card shows step name as title, filename as subtitle, step ID, and teammate', () => {
    // Given a delivery with step "01-02 Setup API routes" in progress
    // assigned to "crafter-02", modifying "src/routes.ts"
    const card = createFileCardData({
      filename: 'src/routes.ts',
      stepId: '01-02',
      stepName: 'Setup API routes',
      displayColumn: 'in_progress',
      teammateId: 'crafter-02',
    });

    // When Andres views the board
    render(<FileCard card={card} />);

    // Then the card shows "Setup API routes" as the primary title
    expect(screen.getByText('Setup API routes')).toBeInTheDocument();
    // And the card shows "src/routes.ts" as a muted subtitle
    expect(screen.getByText('src/routes.ts')).toBeInTheDocument();
    // And the card shows step ID "01-02" in the top-right corner
    const stepId = screen.getByText('01-02');
    expect(stepId).toBeInTheDocument();
    expect(stepId.className).toMatch(/font-mono/);
    // And the card shows teammate "crafter-02" with a colored label
    const teammate = screen.getByText('crafter-02');
    expect(teammate).toBeInTheDocument();
    expect(teammate.className).toMatch(/text-(?!gray)/);
  });
});

// =================================================================
// Walking Skeleton 2: Andres clicks a card and reads full step context
// =================================================================
describe('Walking Skeleton: Andres clicks a card and reads full step context', () => {
  it('modal opens with description, files, conflicts, and teammate', async () => {
    // Dynamic import since StepDetailModal does not exist yet
    const { StepDetailModal } = await import(
      /* @vite-ignore */ MODAL_MODULE_PATH
    );

    // Given step "01-02 Setup API routes" in progress with description and conflicts
    const stepState = createStepState({
      step_id: '01-02',
      name: 'Setup API routes',
      status: 'in_progress',
      teammate_id: 'crafter-02',
      started_at: '2026-01-01T00:15:00Z',
      files_to_modify: ['src/routes.ts', 'src/schema.ts'],
    });

    const planStep = createPlanStep({
      step_id: '01-02',
      name: 'Setup API routes',
      description: 'Create REST API route handlers for authentication.',
      files_to_modify: ['src/routes.ts', 'src/schema.ts'],
      conflicts_with: ['01-01'],
    });

    const planStepLookup = new Map([
      ['01-01', createPlanStep({ step_id: '01-01', name: 'Setup database', files_to_modify: ['src/db.ts'] })],
      ['01-02', planStep],
    ]);

    const onClose = vi.fn();

    // When Andres clicks the card (simulated by rendering the modal)
    render(
      <StepDetailModal
        stepState={stepState}
        planStep={planStep}
        planStepLookup={planStepLookup}
        onClose={onClose}
      />,
    );

    // Then the modal shows title "Setup API routes"
    expect(screen.getByText('Setup API routes')).toBeInTheDocument();
    // And the description
    expect(screen.getByText('Create REST API route handlers for authentication.')).toBeInTheDocument();
    // And the files
    expect(screen.getByText('src/routes.ts')).toBeInTheDocument();
    expect(screen.getByText('src/schema.ts')).toBeInTheDocument();
    // And the conflict with "Setup database"
    expect(screen.getByText(/Setup database/)).toBeInTheDocument();
    // And the teammate
    expect(screen.getByText('crafter-02')).toBeInTheDocument();

    // And Andres can close the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// =================================================================
// Walking Skeleton 3: Andres checks delivery progress and sees phase
// =================================================================
describe('Walking Skeleton: Andres checks delivery progress and sees the current phase', () => {
  it('progress header shows "Phase 2 of 3" and step count', () => {
    // Given a delivery with 3 layers, 7 total steps, 3 completed, on layer 2
    const summary = createSummary({
      total_steps: 7,
      total_layers: 3,
      completed: 3,
      in_progress: 2,
    });

    // When Andres views the progress header
    render(
      <ProgressHeader
        summary={summary}
        currentLayer={2}
        createdAt="2026-03-01T00:00:00Z"
        now={new Date('2026-03-01T02:00:00Z')}
      />,
    );

    // Then the phase indicator shows "Phase 2 of 3"
    expect(screen.getByText(/Phase 2 of 3/)).toBeInTheDocument();
    // And the progress shows step count
    expect(screen.getByText(/3\s*\/\s*7/)).toBeInTheDocument();
  });
});

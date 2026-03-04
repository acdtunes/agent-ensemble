/**
 * Acceptance tests: Remove Teammates Section - Step 01-02
 *
 * Driving port: StepCard component (rendered via props including teammateId)
 * Validates: teammate indicators are NOT displayed on cards
 *
 * Note: Original US-05 tests (teammate visibility) are superseded by
 * the remove-teammates-section feature. Cards now show step name and
 * status color only, without agent IDs or emoji badges.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StepCard } from '../../../../components/StepCard';
import { createStepCardData } from './test-fixtures';

afterEach(cleanup);

// =================================================================
// Removal validation: Cards do not display teammate indicators
// =================================================================
describe('Remove Teammates: Cards do not display agent indicators', () => {
  it('card with teammateId does not show teammate ID or emoji', () => {
    // Given a step assigned to a teammate
    const card = createStepCardData({
      stepId: '01-02',
      stepName: 'Setup API routes',
      displayColumn: 'in_progress',
      fileCount: 1,
      files: ['src/routes.ts'],
      teammateId: 'crafter-02',
    });

    // When Andres views the card
    render(<StepCard card={card} />);

    // Then the card does NOT show the teammate ID
    expect(screen.queryByText(/crafter-02/)).not.toBeInTheDocument();
    // And the card still shows the step name
    expect(screen.getByText('Setup API routes')).toBeInTheDocument();
  });

  it('cards preserve step name and status color without teammate display', () => {
    // Given two steps assigned to different teammates
    const card1 = createStepCardData({
      stepId: '01-01',
      stepName: 'Setup database',
      displayColumn: 'in_progress',
      fileCount: 1,
      files: ['src/db.ts'],
      teammateId: 'crafter-01',
    });
    const card2 = createStepCardData({
      stepId: '01-02',
      stepName: 'Setup API routes',
      displayColumn: 'done',
      fileCount: 1,
      files: ['src/routes.ts'],
      teammateId: 'crafter-02',
    });

    // When Andres views both cards
    render(
      <div>
        <StepCard card={card1} />
        <StepCard card={card2} />
      </div>,
    );

    // Then step names are visible
    expect(screen.getByText('Setup database')).toBeInTheDocument();
    expect(screen.getByText('Setup API routes')).toBeInTheDocument();
    // And teammate IDs are NOT visible
    expect(screen.queryByText(/crafter-01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/crafter-02/)).not.toBeInTheDocument();
  });
});

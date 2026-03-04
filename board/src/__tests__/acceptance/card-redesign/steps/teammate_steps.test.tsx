/**
 * Acceptance tests: US-05 - Teammate Visibility on Cards
 *
 * Driving port: StepCard component (rendered via props including teammateId)
 * Validates: teammate label rendering and color differentiation
 *
 * Gherkin reference: milestone-3-teammate-visibility.feature (US-05 scenarios)
 *
 * Color determinism, palette validity, and edge cases are covered by
 * teammateColors.test.ts — only acceptance-level scenarios kept here.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StepCard } from '../../../../components/StepCard';
import { createStepCardData } from './test-fixtures';

afterEach(cleanup);

// =================================================================
// US-05 Scenario 1: Active card shows teammate with colored label
// =================================================================
describe('US-05: Active card shows teammate with colored label', () => {
  it('card for step "01-02" shows "crafter-02" with a person icon and colored label', () => {
    // Given step "01-02 Setup API routes" is in progress, assigned to "crafter-02"
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

    // Then the card shows the label "crafter-02"
    expect(screen.getByText(/crafter-02/)).toBeInTheDocument();
    // And the label uses a distinctive text color (not default gray)
    const label = screen.getByText(/crafter-02/);
    expect(label.className).toMatch(/text-(?!gray)/);
  });
});

// =================================================================
// US-05 Scenario 3: Different teammates display different colors
// =================================================================
describe('US-05: Different teammates display different label colors', () => {
  it('"crafter-01" and "crafter-02" have different text colors', () => {
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
      displayColumn: 'in_progress',
      fileCount: 1,
      files: ['src/routes.ts'],
      teammateId: 'crafter-02',
    });

    // When Andres views cards from both steps
    render(
      <div>
        <div data-testid="card-1"><StepCard card={card1} /></div>
        <div data-testid="card-2"><StepCard card={card2} /></div>
      </div>,
    );

    // Then the label colors differ
    const label1 = screen.getByText(/crafter-01/);
    const label2 = screen.getByText(/crafter-02/);
    const color1 = label1.className.match(/text-\w+-\d+/)?.[0];
    const color2 = label2.className.match(/text-\w+-\d+/)?.[0];
    expect(color1).toBeDefined();
    expect(color2).toBeDefined();
    expect(color1).not.toBe(color2);
  });
});

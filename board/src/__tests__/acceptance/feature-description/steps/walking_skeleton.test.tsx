/**
 * Walking Skeleton: Feature Description
 *
 * Thinnest end-to-end slice proving description display works.
 * Tests the observable user value: seeing descriptions on cards and board headers.
 *
 * Driving ports:
 *   - FeatureCard component (rendered via props)
 *   - FeatureBoardView component (rendered via props)
 *
 * Gherkin reference: walking-skeleton.feature
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  createFeatureWithDescriptions,
  createRoadmapWithDescriptions,
} from './test-fixtures';

afterEach(cleanup);

// Computed paths prevent Vite from statically resolving imports before files exist
const FEATURE_CARD_PATH = ['..', '..', '..', '..', 'components', 'FeatureCard'].join('/');
const FEATURE_BOARD_VIEW_PATH = ['..', '..', '..', '..', 'components', 'FeatureBoardView'].join('/');

// =================================================================
// Walking Skeleton 1: Developer views feature card with description
// =================================================================

// @skip - Description display not yet implemented in FeatureCard
describe.skip('Walking Skeleton: Developer views feature card with description', () => {
  it('shows short description below the feature name', async () => {
    // Given feature "auth-system" has short description
    const feature = createFeatureWithDescriptions(
      'auth-system',
      'Handles user authentication and session management',
    );

    // When I view the feature card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then I see the short description below the feature name
    expect(screen.getByText('auth-system')).toBeInTheDocument();
    expect(
      screen.getByText('Handles user authentication and session management'),
    ).toBeInTheDocument();
  });
});

// =================================================================
// Walking Skeleton 2: Developer views feature board with description header
// =================================================================

// @skip - Description header not yet implemented in FeatureBoardView
describe.skip('Walking Skeleton: Developer views feature board with description header', () => {
  it('shows description header above the Kanban board', async () => {
    // Given feature "auth-system" has a detailed description
    const description =
      'Provides secure authentication including login, logout, password reset, and session management. Supports OAuth2 providers and multi-factor authentication.';
    const roadmap = createRoadmapWithDescriptions(undefined, description);
    const features = [
      createFeatureWithDescriptions('auth-system', undefined, description),
    ];

    // When I open the feature board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    render(
      <FeatureBoardView
        projectId="alpha"
        featureId="auth-system"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then I see the description header above the Kanban board
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});

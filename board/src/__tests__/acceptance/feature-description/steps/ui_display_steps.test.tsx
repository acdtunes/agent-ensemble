/**
 * Acceptance tests: UI Display for Feature Description
 *
 * Tests the React components for description display:
 *   - FeatureCard displays shortDescription
 *   - FeatureBoardView displays description header
 *   - Truncation, fallback, and edge case handling
 *
 * Driving ports: React components rendered via props
 *
 * Gherkin reference: milestone-2-ui-display.feature
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  createFeatureWithDescriptions,
  createLegacyFeature,
  createRoadmapWithDescriptions,
  createLegacyRoadmap,
  LONG_DESCRIPTION,
  SPECIAL_CHARS_SHORT,
  SPECIAL_CHARS_LONG,
} from './test-fixtures';

afterEach(cleanup);

// Computed paths prevent Vite from statically resolving imports before files exist
const FEATURE_CARD_PATH = ['..', '..', '..', '..', 'components', 'FeatureCard'].join('/');
const FEATURE_BOARD_VIEW_PATH = ['..', '..', '..', '..', 'components', 'FeatureBoardView'].join('/');

// =================================================================
// US-01: FeatureCard displays shortDescription
// =================================================================

// First acceptance test enabled - Updated for step 03-01: shortDescription is now primary label
describe('US-01 Scenario: FeatureCard shows short description as primary label', () => {
  it('Given feature with short description, When viewed, Then shortDescription appears as primary bold label', async () => {
    // Given feature with short description
    const feature = createFeatureWithDescriptions('auth-system', 'Handles user authentication');

    // When viewing the feature card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then shortDescription appears as the primary bold label in heading
    const card = screen.getByRole('button');
    const primaryLabel = within(card).getByRole('heading', { level: 3 });
    expect(primaryLabel).toHaveTextContent('Handles user authentication');
    expect(primaryLabel.className).toMatch(/font-semibold.*text-gray-100|text-gray-100.*font-semibold/);

    // And feature-id appears below in muted style
    const featureId = within(card).getByTestId('feature-id');
    expect(featureId).toHaveTextContent('auth-system');
    expect(featureId.className).toMatch(/text-gray-500/);
  });
});

// Truncation test enabled - Updated for step 03-01: shortDescription is now primary label
describe('US-01 Scenario: FeatureCard truncates long short description with ellipsis', () => {
  it('Given feature with long description, When viewed, Then truncated with ellipsis', async () => {
    // Given feature with long description
    const feature = createFeatureWithDescriptions('payment-gateway', LONG_DESCRIPTION);

    // When viewing the feature card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then the primary label container has truncation styling
    const primaryLabel = screen.getByTestId('feature-primary-label');
    expect(primaryLabel.textContent).toContain('This is a very long');
    expect(primaryLabel.className).toMatch(/truncate|line-clamp|overflow-hidden/);
  });
});

// Fallback test enabled
describe('US-01 Scenario: FeatureCard shows nothing when short description is undefined', () => {
  it('Given feature without short description, When viewed, Then no description element', async () => {
    // Given feature without short description
    const feature = createLegacyFeature('legacy-feature');

    // When viewing the feature card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    const { container } = render(<FeatureCard feature={feature} />);

    // Then no description element is rendered
    // Feature name should exist (use heading to avoid matching feature-id span)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('legacy-feature');
    // But no element with description text-specific styling
    const descriptionElements = container.querySelectorAll('[data-testid="feature-description"]');
    expect(descriptionElements).toHaveLength(0);
  });
});

// =================================================================
// US-02: FeatureBoardView displays description header
// =================================================================

// US-02 Scenario 1: Description header appears above Kanban board - belongs to step 02-02
describe('US-02 Scenario: FeatureBoardView shows description header above Kanban board', () => {
  it('Given feature with description, When opened, Then header appears above board', async () => {
    // Given feature with description
    const description = 'Provides secure authentication including login, logout, and session management.';
    const roadmap = createRoadmapWithDescriptions(undefined, description);
    const features = [createFeatureWithDescriptions('auth-system', undefined, description)];

    // When opening the feature board
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

    // Then description header appears
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});

// US-02 Scenario 2: Static display (no collapse/expand) - belongs to step 02-02
describe('US-02 Scenario: FeatureBoardView description header has static display', () => {
  it('Given feature with description, When opened, Then header is always visible without collapse', async () => {
    // Given feature with description
    const description = 'Detailed explanation of the feature purpose and scope.';
    const roadmap = createRoadmapWithDescriptions(undefined, description);
    const features = [createFeatureWithDescriptions('auth-system', undefined, description)];

    // When opening the feature board
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

    // Then header is visible and no collapse/expand control exists
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand|collapse/i })).not.toBeInTheDocument();
  });
});

// US-02 Scenario 3: No header when description undefined - belongs to step 02-02
describe('US-02 Scenario: FeatureBoardView shows nothing when description is undefined', () => {
  it('Given feature without description, When opened, Then no header rendered', async () => {
    // Given feature without description
    const roadmap = createLegacyRoadmap();
    const features = [createLegacyFeature('legacy-feature')];

    // When opening the feature board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    const { container } = render(
      <FeatureBoardView
        projectId="alpha"
        featureId="legacy-feature"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then no description header element exists
    const descriptionHeader = container.querySelector('[data-testid="feature-description-header"]');
    expect(descriptionHeader).toBeNull();
  });
});

// =================================================================
// US-03: Backward compatibility
// =================================================================

// Backward compatibility test enabled
describe('US-03 Scenario: Existing feature without descriptions displays normally', () => {
  it('Given legacy feature, When viewed on card, Then displays name and progress only', async () => {
    // Given legacy feature
    const feature = createLegacyFeature('existing-feature');

    // When viewing the card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then card displays feature name and progress
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('existing-feature');
    expect(screen.getByText(/5 of 10/)).toBeInTheDocument();
    // And no description elements shown
    expect(screen.queryByTestId('feature-description')).not.toBeInTheDocument();
  });
});

// US-03 Scenario: Backward compatibility for boards - belongs to step 02-02
describe.skip('US-03 Scenario: Existing feature board without descriptions displays normally', () => {
  it('Given legacy feature, When opened on board, Then displays without description header', async () => {
    // Given legacy feature
    const roadmap = createLegacyRoadmap();
    const features = [createLegacyFeature('existing-feature')];

    // When opening the board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    render(
      <FeatureBoardView
        projectId="alpha"
        featureId="existing-feature"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then board displays normally without description header
    expect(screen.getByText('existing-feature')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-description-header')).not.toBeInTheDocument();
  });
});

// =================================================================
// Edge cases and error paths
// =================================================================

// Empty string handling test enabled
describe('US-01 Scenario: FeatureCard handles empty string short description', () => {
  it('Given feature with empty string description, When viewed, Then no description rendered', async () => {
    // Given feature with empty string description
    const feature = createFeatureWithDescriptions('empty-desc', '');

    // When viewing the card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then no description element is rendered
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('empty-desc');
    expect(screen.queryByTestId('feature-description')).not.toBeInTheDocument();
  });
});

// US-02 Edge case: empty string description - belongs to step 02-02
describe.skip('US-02 Scenario: FeatureBoardView handles empty string description', () => {
  it('Given feature with empty description, When opened, Then no header rendered', async () => {
    // Given feature with empty description
    const roadmap = createRoadmapWithDescriptions(undefined, '');
    const features = [createFeatureWithDescriptions('empty-desc', undefined, '')];

    // When opening the board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    render(
      <FeatureBoardView
        projectId="alpha"
        featureId="empty-desc"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then no description header is rendered
    expect(screen.queryByTestId('feature-description-header')).not.toBeInTheDocument();
  });
});

// Whitespace handling test enabled
describe('US-01 Scenario: FeatureCard handles whitespace-only short description', () => {
  it('Given feature with whitespace description, When viewed, Then no description rendered', async () => {
    // Given feature with whitespace-only description
    const feature = createFeatureWithDescriptions('whitespace-desc', '   ');

    // When viewing the card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then no description element is rendered
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('whitespace-desc');
    expect(screen.queryByTestId('feature-description')).not.toBeInTheDocument();
  });
});

// US-02 Edge case: whitespace-only description - belongs to step 02-02
describe.skip('US-02 Scenario: FeatureBoardView handles whitespace-only description', () => {
  it('Given feature with whitespace description, When opened, Then no header rendered', async () => {
    // Given feature with whitespace-only description
    const roadmap = createRoadmapWithDescriptions(undefined, '   ');
    const features = [createFeatureWithDescriptions('whitespace-desc', undefined, '   ')];

    // When opening the board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    render(
      <FeatureBoardView
        projectId="alpha"
        featureId="whitespace-desc"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then no description header is rendered
    expect(screen.queryByTestId('feature-description-header')).not.toBeInTheDocument();
  });
});

// Special character handling test enabled
describe('US-01 Scenario: FeatureCard preserves special characters', () => {
  it('Given feature with special characters, When viewed, Then displayed correctly', async () => {
    // Given feature with special characters in description
    const feature = createFeatureWithDescriptions('special-chars', SPECIAL_CHARS_SHORT);

    // When viewing the card
    const { FeatureCard } = await import(/* @vite-ignore */ FEATURE_CARD_PATH);
    render(<FeatureCard feature={feature} />);

    // Then special characters are displayed correctly
    expect(screen.getByText('Handles OAuth2 & JWT tokens')).toBeInTheDocument();
  });
});

// @skip - XSS protection not yet implemented
describe.skip('US-02 Scenario: FeatureBoardView preserves special characters safely', () => {
  it('Given feature with potential XSS, When opened, Then displayed safely', async () => {
    // Given feature with potential XSS characters
    const roadmap = createRoadmapWithDescriptions(undefined, SPECIAL_CHARS_LONG);
    const features = [createFeatureWithDescriptions('special-chars', undefined, SPECIAL_CHARS_LONG)];

    // When opening the board
    const { FeatureBoardView } = await import(/* @vite-ignore */ FEATURE_BOARD_VIEW_PATH);
    render(
      <FeatureBoardView
        projectId="alpha"
        featureId="special-chars"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Then content is displayed as text (React escapes by default)
    // The <script> tag should appear as text, not execute
    expect(screen.getByText(/Supports.*tags are escaped.*quotes.*work/)).toBeInTheDocument();
  });
});

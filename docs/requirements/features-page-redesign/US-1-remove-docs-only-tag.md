# US-1: Remove "Docs only" Status Tag

## Problem
Elena Ruiz is a project maintainer who manages 15+ features across the "acme-platform" project. She finds it confusing that features without a roadmap show a "Docs only" label -- it implies the feature is only documentation, when in reality it just has not had a roadmap created yet. The label adds visual noise without conveying useful status information.

## Who
- Project maintainer | Managing a multi-feature project | Wants a clean, accurate status overview

## Job Story Trace
**When** I scan the features overview and see a "Docs only" label,
**I want to** understand what that feature's actual status is,
**so I can** decide whether it needs a roadmap or attention.

## Solution
Remove the "Docs only" display state entirely. Features without a roadmap show only their name on the card -- no status label, no progress bar, no step count. They remain clickable and navigate to the Feature Docs view.

## Domain Examples

### 1: Feature with no roadmap shows clean card
Elena opens the "acme-platform" project. The feature "api-documentation" has no `roadmap.yaml` file. Its card shows only the name "api-documentation" with no status badge, no progress bar, and no step count. She clicks it and navigates to the Feature Docs view.

### 2: Feature with roadmap and zero progress shows "Planned"
Elena sees the feature "billing-reports" which has a roadmap with 6 steps, all pending. Its card shows "Planned" status, "0 of 6" progress, and an empty progress bar. The "Planned" label is distinct from the old "Docs only" because it indicates a roadmap exists with defined work.

### 3: Classification function no longer returns "docs-only"
The `classifyFeatureDisplayState` function currently returns `"docs-only"` when `hasRoadmap === false`. After this change, it either returns a different value (e.g., no display state / null) or the card component simply does not render a label for features without a roadmap. The `STATE_LABELS` map no longer includes a `"docs-only"` entry.

## UAT Scenarios (BDD)

### Scenario: Feature without roadmap shows no status label
Given Elena Ruiz is viewing the "acme-platform" features overview
And "api-documentation" has no roadmap file
When the features page loads
Then the card for "api-documentation" displays the name "api-documentation"
And no status label text appears on that card
And no progress bar is rendered on that card

### Scenario: Feature without roadmap shows no step count
Given Elena Ruiz is viewing the "acme-platform" features overview
And "email-templates" has no roadmap file
When the features page loads
Then the card for "email-templates" does not show any step count text
And the card for "email-templates" does not show any in-progress or failed badges

### Scenario: Feature without roadmap still navigates to docs view
Given Elena Ruiz is viewing the "acme-platform" features overview
And "onboarding-flow" has no roadmap file
When Elena clicks the "onboarding-flow" card
Then the Feature Docs view opens for "onboarding-flow"

### Scenario: Features with roadmaps retain their status labels
Given Elena Ruiz is viewing the "acme-platform" features overview
And "auth-service" has a roadmap with 12 steps, 5 completed, 2 in progress
When the features page loads
Then the card for "auth-service" displays status label "Active"
And the card for "auth-service" shows "5 of 12" progress

## Acceptance Criteria
- [ ] Cards for features without a roadmap display only the feature name
- [ ] No "Docs only" text appears anywhere on the features page
- [ ] Cards for features without a roadmap show no progress bar or step count
- [ ] Features with roadmaps continue to display Active, Planned, or Completed status labels
- [ ] Clicking a no-roadmap feature card still navigates to Feature Docs view

## Technical Notes
- Modify `classifyFeatureDisplayState` or the card rendering to handle `hasRoadmap === false` without producing a visible status label
- Remove `'docs-only'` from `STATE_LABELS` map or stop rendering the label when state is docs-only
- No backend changes needed -- `FeatureSummary.hasRoadmap` already tracks this
- No dependency on other stories

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Specific confusion about "Docs only" label meaning |
| User/persona identified | PASS | Elena Ruiz, project maintainer, 15+ features |
| 3+ domain examples | PASS | 3 examples with real feature names and data |
| UAT scenarios (3-7) | PASS | 4 scenarios covering no-label, no-progress, navigation, and existing labels |
| AC derived from UAT | PASS | 5 criteria mapping to scenario outcomes |
| Right-sized | PASS | ~0.5 day effort, 4 scenarios, single component change |
| Technical notes | PASS | Specific files and functions identified |
| Dependencies tracked | PASS | No dependencies |

**DoR Status**: PASSED

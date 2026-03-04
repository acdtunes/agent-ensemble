# US-3: Status-Grouped and Alphabetical Card Ordering

## Problem
Elena Ruiz is a project maintainer who manages 18 features in the "acme-platform" project. Currently, feature cards appear in filesystem discovery order -- essentially random from her perspective. She cannot tell at a glance which features are active, which are planned, or which are complete. She has to read every card's status label to build a mental picture of project health. She wastes time scanning for active features buried between completed and planned ones.

## Who
- Project maintainer | Managing 10+ features with mixed statuses | Wants to prioritize work by seeing active features first

## Job Story Trace
**When** I open the features page and see cards in an unpredictable order,
**I want to** see features grouped by their status with the most actionable group first,
**so I can** immediately focus on features that need attention without reading every card.

## Solution
Sort features into three status groups displayed in priority order: Active (features with work in progress) first, Planned (features with roadmap but no work started) second, Completed (all steps done) third. Within each group, sort features alphabetically by name. Display group headers with the group name and feature count. Features without a roadmap appear after the three status groups, also sorted alphabetically.

## Domain Examples

### 1: Mixed-status project shows Active features first
Elena opens "acme-platform" which has 3 Active features (auth-service, payment-gateway, user-dashboard), 4 Planned features (billing-reports, data-export, notification-svc, search-indexing), 2 Completed features (ci-pipeline, logging-setup), and 3 features without roadmaps (api-documentation, email-templates, onboarding-flow). The page displays: Active group header "Active (3)" followed by auth-service, payment-gateway, user-dashboard (alphabetical). Then "Planned (4)" followed by billing-reports, data-export, notification-svc, search-indexing. Then "Completed (2)" followed by ci-pipeline, logging-setup. Finally, the three roadmap-less features appear alphabetically.

### 2: Project with only Planned features shows single group
Carlos Mendez opens the "new-initiative" project which has 5 features, all Planned. The page shows a single group header "Planned (5)" followed by the 5 features in alphabetical order. No Active or Completed group headers appear since those groups are empty.

### 3: All features completed shows Completed group only
Elena opens "legacy-migration" where all 4 features are Completed. The page shows "Completed (4)" header followed by the 4 features alphabetically. No Active or Planned groups appear.

## UAT Scenarios (BDD)

### Scenario: Features ordered by status group priority
Given the project "acme-platform" has 3 Active, 4 Planned, and 2 Completed features
When Elena Ruiz opens the features overview
Then Active features appear before Planned features
And Planned features appear before Completed features

### Scenario: Features sorted alphabetically within each group
Given the project "acme-platform" has Active features: user-dashboard, auth-service, payment-gateway
When Elena Ruiz opens the features overview
Then within the Active group, features appear as: auth-service, payment-gateway, user-dashboard

### Scenario: Group headers display name and count
Given the project "acme-platform" has 3 Active, 4 Planned, and 2 Completed features
When Elena Ruiz opens the features overview
Then a group header "Active (3)" appears above the Active features
And a group header "Planned (4)" appears above the Planned features
And a group header "Completed (2)" appears above the Completed features

### Scenario: Empty status groups are not displayed
Given the project "new-initiative" has 5 Planned features and no Active or Completed features
When Carlos Mendez opens the features overview
Then no "Active" group header appears
And the "Planned (5)" group header appears with 5 features
And no "Completed" group header appears

### Scenario: Features without roadmap appear after status groups
Given the project "acme-platform" has 3 features without roadmaps
When Elena Ruiz opens the features overview
Then features without roadmaps appear after the Completed group
And those features are sorted alphabetically: api-documentation, email-templates, onboarding-flow

## Acceptance Criteria
- [ ] Features are grouped in order: Active > Planned > Completed > No Roadmap
- [ ] Within each group, features are sorted alphabetically by name (case-insensitive)
- [ ] Each non-empty group has a visible header showing group name and feature count
- [ ] Empty groups do not display headers or empty space
- [ ] Features without roadmaps appear in a separate section after all status groups
- [ ] Sorting is stable across page refreshes (deterministic)

## Technical Notes
- Sorting logic should be a pure function: `(features: FeatureSummary[]) => GroupedFeatures`
- Reuse `classifyFeatureDisplayState` for group assignment
- Group headers are new UI elements -- simple text dividers in the grid
- The grid layout must accommodate group headers that span the full row
- No backend changes needed -- sorting is client-side
- Depends on US-1 (remove "Docs only") for consistent classification

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Specific pain: filesystem order is unpredictable, requires scanning all cards |
| User/persona identified | PASS | Elena Ruiz (18 features, mixed status) and Carlos Mendez (5 Planned features) |
| 3+ domain examples | PASS | 3 examples covering mixed, single-group, and all-completed scenarios |
| UAT scenarios (3-7) | PASS | 5 scenarios covering ordering, alphabetical, headers, empty groups, no-roadmap |
| AC derived from UAT | PASS | 6 criteria mapping to scenario outcomes |
| Right-sized | PASS | ~1 day effort, 5 scenarios, client-side sorting + headers |
| Technical notes | PASS | Pure function approach, reuse of existing classification |
| Dependencies tracked | PASS | Depends on US-1 for classification consistency |

**DoR Status**: PASSED

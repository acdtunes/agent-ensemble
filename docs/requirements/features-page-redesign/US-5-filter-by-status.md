# US-5: Filter Features by Status

## Problem
Elena Ruiz is a project maintainer who manages 18 features in the "acme-platform" project. During her daily standup, she only cares about Active features. During sprint planning, she focuses on Planned features to decide what to start next. She wants to quickly narrow the view to just one status group without scrolling past irrelevant groups. While status grouping (US-3) helps organize the page, she still has to scroll past groups she does not care about right now.

## Who
- Project maintainer | Focused on a specific status group for a specific task (standup, planning, review) | Wants to isolate one group instantly

## Job Story Trace
**When** I need to focus on just the Active features during my standup,
**I want to** filter the view to show only one status group,
**so I can** see just the features relevant to my current task without scrolling past others.

## Solution
Add a status filter control (toggle buttons or segmented control) near the search box. Options: "All" (default), "Active", "Planned", "Completed". Selecting a status shows only features in that group. The filter composes with the search input (intersection). Each filter option shows its feature count.

## Domain Examples

### 1: Filter to Active during standup
Elena clicks the "Active" filter button. The page shows only the 3 Active features: auth-service, payment-gateway, user-dashboard. The Planned and Completed groups are hidden. The "Active" button appears visually selected. She quickly reviews progress on each active feature during her 2-minute standup update.

### 2: Filter to Planned during sprint planning
Elena clicks the "Planned" filter. The page shows 4 Planned features: billing-reports, data-export, notification-svc, search-indexing. She evaluates which to start next based on step counts.

### 3: Combine status filter with search
Elena has the "Planned" filter active and types "data" in the search box. Only "data-export" is visible. She clears the search and sees all 4 Planned features again. She then clicks "All" and sees all 18 features.

## UAT Scenarios (BDD)

### Scenario: Selecting Active filter shows only active features
Given Elena Ruiz is viewing 18 features for "acme-platform" with 3 Active features
When she selects the "Active" status filter
Then only the 3 Active features are visible
And features from Planned, Completed, and no-roadmap groups are hidden
And the "Active" filter button appears visually selected

### Scenario: Selecting All filter restores full view
Given Elena Ruiz has the "Active" filter selected
When she selects the "All" filter
Then all 18 features are visible in status-grouped order

### Scenario: Status filter buttons show counts
Given Elena Ruiz is viewing features for "acme-platform"
When the features page loads
Then the filter shows "All (12)", "Active (3)", "Planned (4)", "Completed (2)"

### Scenario: Status filter composes with search
Given Elena Ruiz has the "Planned" status filter selected
And 4 Planned features are visible
When she types "data" in the search box
Then only "data-export" is visible
And features not matching both the status filter and search are hidden

### Scenario: Filter counts update when search is active
Given Elena Ruiz has typed "auth" in the search box
When she views the status filter buttons
Then the counts reflect search-filtered totals
And "Active" shows count 1 (only "auth-service" matches)
And "Planned" shows count 0
And "Completed" shows count 0

### Scenario: Default filter is All
Given Elena Ruiz has not interacted with the status filter
When the features page loads
Then the "All" filter is selected by default
And all features are visible

## Acceptance Criteria
- [ ] A status filter control is visible near the search box with options: All, Active, Planned, Completed
- [ ] "All" is selected by default on page load
- [ ] Selecting a status filter shows only features in that status group
- [ ] Each filter option displays its feature count in parentheses
- [ ] The selected filter button is visually distinct from unselected buttons
- [ ] Status filter and search input compose as intersection (both must match)
- [ ] Filter counts update dynamically when search text changes

## Technical Notes
- Status filter state managed locally in `ProjectFeatureView` via `useState<'all' | 'active' | 'planned' | 'completed'>`
- Filter applied after classification, before grouping: chain with search filter
- Filter count computation: count features per status from the search-filtered list
- Consider using a segmented control or button group for the filter UI
- No backend changes needed -- filtering is client-side
- Depends on US-3 (status grouping) for classification logic
- Depends on US-4 (search) for filter composition behavior

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Specific pain: scrolling past irrelevant groups during focused tasks |
| User/persona identified | PASS | Elena Ruiz, project maintainer, standup and planning contexts |
| 3+ domain examples | PASS | 3 examples: standup (Active), planning (Planned), combined with search |
| UAT scenarios (3-7) | PASS | 6 scenarios covering select, restore, counts, composition, dynamic counts, default |
| AC derived from UAT | PASS | 7 criteria mapping to scenario outcomes |
| Right-sized | PASS | ~1 day effort, 6 scenarios, filter UI + composition logic |
| Technical notes | PASS | State type, filter chain, and UI pattern noted |
| Dependencies tracked | PASS | Depends on US-3 and US-4 |

**DoR Status**: PASSED

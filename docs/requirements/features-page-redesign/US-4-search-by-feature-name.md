# US-4: Search Features by Name

## Problem
Elena Ruiz is a project maintainer who manages 18 features in the "acme-platform" project. Even with status grouping (US-3), finding a specific feature like "notification-svc" requires scanning through groups and reading card names. With 18+ features, this visual scanning takes several seconds and is error-prone -- she sometimes misses the card she is looking for and has to scan again. She wants to type a few characters and immediately see only matching features.

## Who
- Project maintainer | Knows the feature name (or partial name) | Wants instant access to a specific feature card

## Job Story Trace
**When** I know which feature I want to check but cannot spot it quickly in a grid of 18 cards,
**I want to** type part of its name and see only matching features,
**so I can** navigate to the right feature in under 2 seconds.

## Solution
Add a text search input above the feature grid. As the user types, features are filtered in real-time to show only those whose name contains the search text (case-insensitive substring match). The search works with status grouping -- filtered results maintain their group structure. When no features match, an empty state message is shown. Clearing the search restores the full feature list.

## Domain Examples

### 1: Partial name match filters instantly
Elena types "pay" into the search box. Immediately, only "payment-gateway" remains visible in the Active group. All other cards and empty group headers are hidden. The Active group header updates to "Active (1)".

### 2: Search across multiple groups
Elena types "log" into the search box. Two features match: "logging-setup" (Completed) and "execution-log-viewer" (Planned, hypothetical). Both appear in their respective groups with updated counts.

### 3: No match shows helpful empty state
Elena types "zzz-nothing" into the search box. No features match. The grid is replaced by a message: "No features match your search." Clearing the search text restores all features.

## UAT Scenarios (BDD)

### Scenario: Real-time filtering as user types
Given Elena Ruiz is viewing 18 features for "acme-platform"
When she types "pay" in the search box
Then only "payment-gateway" is visible
And the typing produces results without pressing Enter or clicking a button

### Scenario: Search is case-insensitive
Given Elena Ruiz is viewing features for "acme-platform"
When she types "Auth" in the search box
Then "auth-service" is visible

### Scenario: Search matches substring anywhere in name
Given Elena Ruiz is viewing features for "acme-platform"
When she types "service" in the search box
Then "auth-service" is visible
And "notification-svc" is not visible (does not contain "service")

### Scenario: Empty search shows all features
Given Elena Ruiz has typed "pay" and sees only "payment-gateway"
When she clears the search box
Then all 18 features are visible in status-grouped order

### Scenario: No results shows empty state message
Given Elena Ruiz is viewing features for "acme-platform"
When she types "zzz-nonexistent" in the search box
Then no feature cards are visible
And the message "No features match your search" is displayed

### Scenario: Group headers update to reflect filtered results
Given Elena Ruiz is viewing features for "acme-platform" with 3 Active features
When she types "auth" in the search box
Then the Active group header shows "Active (1)"
And Planned and Completed group headers are hidden (zero matches)

## Acceptance Criteria
- [ ] A search text input is visible above the feature grid
- [ ] Typing in the search box filters features in real-time (no submit button needed)
- [ ] Filtering is case-insensitive substring match on feature name
- [ ] Clearing the search box restores the full feature list
- [ ] When no features match, a "No features match your search" message is displayed
- [ ] Status group headers update their counts to reflect filtered results
- [ ] Empty status groups (zero matches after filtering) hide their headers

## Technical Notes
- Search state managed locally in `ProjectFeatureView` component via `useState`
- Filter applied before grouping: `features.filter(f => f.name.includes(query.toLowerCase()))`
- No debounce needed for client-side filtering of <100 items
- Search input should have a placeholder like "Search features..." and a clear button
- No backend changes needed -- filtering is client-side
- Depends on US-3 (status grouping) for group header behavior

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Specific pain: visual scanning 18 cards takes seconds, error-prone |
| User/persona identified | PASS | Elena Ruiz, project maintainer, knows feature name |
| 3+ domain examples | PASS | 3 examples: partial match, cross-group match, no match |
| UAT scenarios (3-7) | PASS | 6 scenarios covering real-time, case, substring, clear, empty, headers |
| AC derived from UAT | PASS | 7 criteria mapping to scenario outcomes |
| Right-sized | PASS | ~1 day effort, 6 scenarios, single component + filter logic |
| Technical notes | PASS | State management, filter strategy, and input design noted |
| Dependencies tracked | PASS | Depends on US-3 for group header updates |

**DoR Status**: PASSED

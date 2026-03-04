# US-001: Last Updated Timestamp Display on Feature Cards

## Problem
Sarah Chen is a project lead managing multiple features across her team's nw-teams board. She finds it frustrating to identify which features have stalled because there's no visual indicator of recency. She currently has to click into each feature's roadmap file or check git logs to see when work last happened, which wastes time during daily standup prep.

## Who
- Project leads reviewing feature portfolio health
- Individual contributors checking if their features are current
- Context: Morning standup prep, weekly planning, ad-hoc status checks
- Motivation: Stay aware of feature activity without manual investigation

## Solution
Display a human-readable "Updated X ago" timestamp on each FeatureCard showing when the roadmap.yaml was last modified. The timestamp appears in a muted color below the feature name, using relative time format (5m, 2h, 3d, 2w ago).

## Domain Examples

### 1: Active Feature with Recent Update
Sarah opens her board at 9:00 AM. The "user-authentication" feature card shows "Updated 5m ago" below the feature name. She knows Jake is actively working on it right now.

### 2: Stalled Feature Identified
Sarah sees the "payment-integration" feature shows "Updated 2w ago" and status is "Active" (3/10 steps done). She realizes it's stalled and adds it to standup discussion to identify blockers.

### 3: Planned Feature (Expected Staleness)
The "mobile-app" feature shows "Updated 3mo ago" and status is "Planned" (0/15 steps done). This is expected since the feature is queued for Q2. Sarah doesn't worry about this one.

## UAT Scenarios (BDD)

### Scenario 1: Display recent timestamp for active feature
```gherkin
Given the roadmap.yaml for feature "user-auth" was modified 5 minutes ago
When Sarah views the project board
Then the "user-auth" FeatureCard displays "Updated 5m ago"
And the timestamp appears below the feature name
And the timestamp uses a muted gray color
```

### Scenario 2: Display stale timestamp for inactive feature
```gherkin
Given the roadmap.yaml for feature "payment-integration" was modified 14 days ago
When Sarah views the project board
Then the "payment-integration" FeatureCard displays "Updated 2w ago"
And Sarah can identify the feature as potentially stalled at a glance
```

### Scenario 3: Timestamp updates on board refresh
```gherkin
Given Sarah viewed the board at 9:00 AM showing "Updated 1h ago" for feature "analytics"
And no changes were made to the analytics roadmap
When Sarah refreshes the board at 9:30 AM
Then the "analytics" FeatureCard displays "Updated 1h 30m ago"
```

### Scenario 4: Handle features without roadmap gracefully
```gherkin
Given a feature exists but has no roadmap.yaml file
When Sarah views the project board
Then the FeatureCard displays no timestamp
And the card layout remains consistent with timestamped cards
```

### Scenario 5: Relative time format follows conventions
```gherkin
Given various features with different modification times:
  | Feature | Last Modified |
  | auth    | 30 seconds ago |
  | payment | 45 minutes ago |
  | search  | 8 hours ago |
  | mobile  | 5 days ago |
  | reports | 3 weeks ago |
When Sarah views the project board
Then the timestamps display as:
  | Feature | Display |
  | auth    | Updated 30s ago |
  | payment | Updated 45m ago |
  | search  | Updated 8h ago |
  | mobile  | Updated 5d ago |
  | reports | Updated 3w ago |
```

## Acceptance Criteria

- [ ] FeatureCard displays "Updated X ago" timestamp below feature name when roadmap.yaml exists
- [ ] Timestamp format uses relative time (s, m, h, d, w) following GitHub conventions
- [ ] Timestamp appears in muted gray color (text-gray-400) for visual hierarchy
- [ ] Timestamp updates correctly on board refresh reflecting current time
- [ ] Features without roadmap.yaml show no timestamp (graceful degradation)
- [ ] Timestamp does not interfere with existing card elements (description, progress bar, status label)
- [ ] Timestamp data comes from roadmap.yaml file modification time (already available from server)

## Technical Notes

### Available Data
- Server already provides `lastModified` timestamp from roadmap.yaml via `FeatureSummary` type
- No backend changes required — pure UI enhancement

### Constraints
- Must not add visual clutter (keep small, muted)
- Should position logically in existing card layout
- Relative time formatting follows industry conventions (GitHub, Slack pattern)

### Dependencies
- None — uses existing `FeatureSummary.lastModified` field
- Requires relative-time utility function (e.g., `formatRelativeTime()`)

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Sarah Chen scenario with specific pain point (manual git log checking) |
| User/persona identified | PASS | Project leads and individual contributors with specific context |
| 3+ domain examples | PASS | Three scenarios with real names and realistic data |
| UAT scenarios (3-7) | PASS | Five BDD scenarios covering happy path, edge cases, format conventions |
| AC derived from UAT | PASS | Seven AC items derived directly from scenarios |
| Right-sized | PASS | Estimated 30-min implementation, 5 scenarios, single demo |
| Technical notes | PASS | Data source, constraints, dependencies documented |
| Dependencies tracked | PASS | No dependencies — uses existing data |

**DoR Status**: PASSED

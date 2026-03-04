# Shared Artifacts Registry: Features Page Redesign

## Artifacts

### feature_list
- **Source of truth**: `GET /api/projects/{projectId}/features` -> `FeatureSummary[]`
- **Consumers**: feature grid, search filter, status group headers, status filter counts
- **Owner**: `useFeatureList` hook
- **Integration risk**: LOW -- single fetch, single consumer hook
- **Validation**: Feature count in grid matches API response length

### feature_display_state
- **Source of truth**: `classifyFeatureDisplayState(feature)` in `FeatureCard.tsx`
- **Consumers**: card status label, status group assignment, status filter logic
- **Owner**: `FeatureCard` component (pure function)
- **Integration risk**: MEDIUM -- classification logic must be identical between card rendering and group sorting. If grouping uses a different classification than the card label, features appear in wrong groups.
- **Validation**: Card status label matches the group it appears in

### search_query
- **Source of truth**: search input field `useState` value
- **Consumers**: feature name filter logic, search input display value
- **Owner**: `ProjectFeatureView` component (new state)
- **Integration risk**: LOW -- single source, local state
- **Validation**: Displayed text matches filter behavior

### active_status_filter
- **Source of truth**: status filter toggle `useState` value
- **Consumers**: feature visibility filter, toggle button active state
- **Owner**: `ProjectFeatureView` component (new state)
- **Integration risk**: LOW -- single source, local state
- **Validation**: Selected filter matches visible features

### feature_progress
- **Source of truth**: `FeatureSummary.completed` / `FeatureSummary.totalSteps`
- **Consumers**: progress label text, progress bar width percentage
- **Owner**: `FeatureCard` component
- **Integration risk**: LOW -- derived from same source fields
- **Validation**: Progress bar visual width matches label ratio

## Integration Checkpoints

1. **Classification consistency**: The function used to assign features to status groups MUST be the same `classifyFeatureDisplayState` function used to render the card's status label. Extract this as a shared pure function (already exists).

2. **Filter composition**: Search filter (by name) and status filter (by group) must compose as intersection (AND), not union (OR). A feature must match BOTH filters to be visible.

3. **Count accuracy**: Group header counts and status filter button counts must reflect the current filtered set, not the total unfiltered set. When search is active, counts update.

4. **No-roadmap features**: Features with `hasRoadmap === false` must be handled consistently:
   - Card: no status label, no progress bar
   - Grouping: appear after Completed group (or within Planned -- decision needed)
   - Status filter: not included in any status group count; visible under "All" filter
   - Click: navigate to Docs view (unchanged behavior)

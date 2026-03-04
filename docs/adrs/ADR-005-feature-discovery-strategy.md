# ADR-005: Feature Discovery Strategy

## Status

Accepted

## Context

Each project can have multiple features under `docs/feature/{featureId}/`. The server needs to expose feature lists and per-feature artifacts (roadmap.yaml, execution-log.yaml, docs). We need to decide whether feature data is cached, pre-loaded, or computed on-demand.

Scale constraint: 2-5 projects with 1-5 features each. Feature directories contain 0-2 YAML files to parse per feature.

## Options Considered

### Option A: On-demand scan per API request

When `GET /api/projects/:id/features` is called, scan `docs/feature/` directory, read each feature's YAML files, and return computed `FeatureSummary[]`. No caching.

- (+) Always fresh -- filesystem changes reflected immediately
- (+) No cache invalidation logic
- (+) Simplest implementation: pure scan function + IO adapter
- (+) At 1-5 features with 0-2 YAML reads each, total latency <10ms
- (-) Repeated filesystem access on every request
- (-) Scales poorly beyond ~50 features (not a concern at stated scale)

### Option B: Cached with file-watcher invalidation

Scan features on project registration, cache the result, and invalidate when `docs/feature/` directory changes (via chokidar).

- (+) Single filesystem access; subsequent requests served from memory
- (+) Could support WebSocket push of feature list changes
- (-) Cache invalidation complexity: must watch for directory add/remove, YAML file changes
- (-) Adds chokidar watchers per feature directory (up to 5 per project, 25 total)
- (-) Stale cache risk if invalidation misses an edge case
- (-) Significantly more code for negligible performance gain at this scale

### Option C: Periodic polling (like project discovery)

Poll `docs/feature/` at intervals (e.g., every 5 seconds), cache the result between polls.

- (+) Simple timer-based refresh
- (+) Bounded staleness (max poll interval)
- (-) Wasted work when features rarely change
- (-) Awkward UX: feature just created may not appear for up to 5 seconds
- (-) Complexity without benefit -- polling is for project discovery where the developer does not trigger discovery; features are explicitly navigated

## Decision

**Option A: On-demand scan per API request.**

## Consequences

- `discoverFeatures(projectPath)` scans `docs/feature/`, reads YAML files, and returns `FeatureSummary[]` on every call
- No cache, no watchers, no invalidation logic
- Feature list in `ProjectSummary` (sent via WebSocket `project_list`) is computed when the project list is assembled -- acceptable because project list updates are infrequent (on add/remove/state change)
- If performance becomes a concern (>50 features), introduce TTL-based memoization in a future iteration
- Feature artifact endpoints (`/features/:featureId/state`, `/features/:featureId/plan`) also read YAML on-demand using the existing parser functions

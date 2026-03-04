# ADR-006: Feature State Delivery Mechanism (HTTP vs WebSocket)

## Status

Accepted

## Context

The existing board uses WebSocket subscriptions for project-level delivery state: the client subscribes to a projectId, and the server pushes `init` and `update` messages when `state.yaml` changes. The multi-project-selector feature introduces feature-level board views that need `execution-log.yaml` and `roadmap.yaml` data.

We need to decide whether feature-level delivery state is pushed via WebSocket (like project-level state) or fetched via HTTP.

## Options Considered

### Option A: HTTP fetch on navigation (no WebSocket for features)

Feature board view fetches state and plan via HTTP GET when the user navigates to `#/projects/:id/features/:featureId/board`. Manual refresh button for updates.

- (+) No changes to WebSocket protocol or SubscriptionServer
- (+) No additional file watchers for feature-level artifacts
- (+) Simpler client: standard HTTP hooks (useFeatureState) instead of subscription management
- (+) Feature boards are viewed one at a time, and the user typically navigates between them intentionally
- (+) Feature state changes (execution-log.yaml updates) happen minutes apart during delivery -- live push provides negligible UX benefit
- (-) No automatic refresh when execution-log.yaml changes while viewing the board
- (-) User must manually refresh or re-navigate to see updates

### Option B: Extend WebSocket with feature-level subscriptions

Add `subscribe_feature` and `unsubscribe_feature` client messages. Server watches `execution-log.yaml` per feature and pushes updates.

- (+) Live updates on the feature board, consistent with project-level behavior
- (+) Familiar pattern for the existing codebase
- (-) Significant SubscriptionServer changes: per-client feature subscriptions, multiplexed file watchers
- (-) N features x M projects = up to 25 additional file watchers
- (-) Client subscription management complexity: subscribe/unsubscribe on feature navigation, cleanup on unmount
- (-) Feature file watching requires knowing the feature's execution-log path before subscribing, which requires the registry to know about features
- (-) Disproportionate complexity for the update frequency (minutes between changes)

### Option C: Server-Sent Events (SSE) per feature

Dedicated SSE endpoint per feature that streams updates.

- (+) Simpler than WebSocket for one-way server push
- (+) Standard HTTP -- no protocol upgrade
- (-) New transport mechanism alongside existing WebSocket -- inconsistent
- (-) Same file-watcher complexity as Option B
- (-) SSE connection per feature view adds server resource usage

## Decision

**Option A: HTTP fetch on navigation.**

## Consequences

- Feature board data fetched via `GET /api/projects/:id/features/:featureId/state` and `GET /api/projects/:id/features/:featureId/plan`
- `useFeatureState` hook handles loading, error states, and provides a `refetch` function
- No additional file watchers for feature-level artifacts
- WebSocket protocol and SubscriptionServer remain unchanged
- If live feature-level updates become a requirement in the future (e.g., multiple developers simultaneously working on a feature), this decision can be revisited -- the HTTP API contract remains stable and the WebSocket extension is additive
- Existing project-level WebSocket continues to provide live overview updates (project list with feature counts is refreshed via `project_list` messages)

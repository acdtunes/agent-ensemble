# ADR-016: View Mode Toggle Pattern

## Status

Accepted

## Context

REQ-3 requires adding a List view alongside the existing Card grid view in ProjectFeatureView. Need to decide how to implement the view mode toggle and where to store view mode state.

**Quality drivers**: Maintainability (clean state management), Testability (isolated components)

**Constraints**: 1 developer, short timeline, functional programming paradigm

## Decision

Local component state with conditional rendering.

- View mode state (`'card' | 'list'`) stored in ProjectFeatureView via `useState`
- ViewModeToggle component receives current mode and onToggle callback
- Conditional rendering switches between FeatureGrid and FeatureListView
- No global state or context required

```
ProjectFeatureView
  useState<'card' | 'list'>
    ├── ViewModeToggle (stateless)
    ├── FeatureGrid (when card)
    └── FeatureListView (when list)
```

## Alternatives Considered

### 1. URL-based view mode (hash parameter)

```
#/projects/{id}?view=list
```

- Pros: Shareable URLs, browser back/forward support
- Cons: Adds routing complexity, overkill for transient UI preference
- Rejected: View mode is session preference, not navigation state

### 2. Global context/store

- Pros: Persists across navigation, single source of truth
- Cons: Over-engineering for single component, adds provider boilerplate
- Rejected: Only ProjectFeatureView needs this state

### 3. localStorage persistence

- Pros: Persists across sessions
- Cons: Extra complexity, potential stale state issues
- Rejected: Can add later if user feedback requests persistence

## Consequences

**Positive**:
- Simple implementation, single useState call
- Easy to test (isolated state)
- No dependencies on routing or global state
- Follows existing component patterns in codebase

**Negative**:
- View mode resets on navigation away and back
- If future views need same toggle, would need to lift state or duplicate

**Accepted trade-off**: Session-only persistence is acceptable for v1. Can add localStorage persistence as enhancement if users request it.

# Component Boundaries - board-ui-redesign

## Overview

Eight requirements mapped to component changes. Each requirement has clear boundaries with minimal cross-cutting concerns.

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shared Types                             │
│   FeatureSummary { order?: number }                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────────┐    ┌─────────────────┐
│ feature-      │    │ featureGrouping   │    │ featureStatus   │
│ discovery.ts  │    │ .ts               │    │ Filter.ts       │
│ (backend)     │    │ (frontend)        │    │ (frontend)      │
│               │    │                   │    │                 │
│ Reads order   │    │ Sorts by order    │    │ (no change)     │
│ from roadmap  │    │ field             │    │                 │
└───────────────┘    └─────────┬─────────┘    └─────────────────┘
                               │
                               ▼
                    ┌───────────────────┐
                    │ ProjectFeature    │
                    │ View.tsx          │
                    │                   │
                    │ + viewMode state  │
                    │ + ViewModeToggle  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
    │ FeatureCard │  │ FeatureGrid │  │ FeatureListView │
    │ .tsx        │  │ (existing)  │  │ .tsx (NEW)      │
    │             │  │             │  │                 │
    │ Swapped     │  │ (no change) │  │ Compact rows    │
    │ layout      │  │             │  │                 │
    └─────────────┘  └─────────────┘  └─────────────────┘
```

## REQ-1: DocViewer Tree Collapsed

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| DocViewer | `board/src/components/DocViewer.tsx:55` | Prop value change |

### Boundary Definition

- **Input**: DocTree, onSelectDoc callback
- **Output**: Renders DocTreeComponent with `defaultExpanded={false}`
- **Invariant**: Feature-level docs (MultiRootDocViewer) remain `defaultExpanded={true}`

### Interface Contract

```typescript
// No interface change - just prop value
<DocTreeComponent tree={tree} onSelectDoc={handleSelectDoc} defaultExpanded={false} />
```

## REQ-2: FeatureCard Layout Swap

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| FeatureCard | `board/src/components/FeatureCard.tsx:93-116` | JSX restructure |

### Boundary Definition

- **Input**: FeatureSummary (unchanged)
- **Output**: Description rendered above feature-id
- **Invariant**: Click-to-copy functionality preserved on feature-id

### Layout Contract

**Before**:
```
┌────────────────────────┐
│ feature-id (clickable) │
│ description            │
└────────────────────────┘
```

**After**:
```
┌────────────────────────┐
│ description            │
│ feature-id (clickable) │
└────────────────────────┘
```

## REQ-3: List View

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| ProjectFeatureView | `board/src/components/ProjectFeatureView.tsx` | Add state + render logic |
| ViewModeToggle | `board/src/components/ViewModeToggle.tsx` | NEW |
| FeatureListView | `board/src/components/FeatureListView.tsx` | NEW |

### Boundary Definition

**ProjectFeatureView**:
- **Input**: features, callbacks (unchanged)
- **State**: `viewMode: 'card' | 'list'`
- **Output**: Renders ViewModeToggle + conditional FeatureGrid/FeatureListView

**ViewModeToggle**:
- **Input**: `mode: 'card' | 'list'`, `onToggle: (mode) => void`
- **Output**: Toggle UI (icon buttons or segmented control)

**FeatureListView**:
- **Input**: Same as current grid rendering (groups, callbacks)
- **Output**: Compact single-row-per-feature layout

### Interface Contracts

```typescript
// ViewModeToggle props
interface ViewModeToggleProps {
  readonly mode: 'card' | 'list';
  readonly onToggle: (mode: 'card' | 'list') => void;
}

// FeatureListView props - mirrors GroupSection pattern
interface FeatureListViewProps {
  readonly groups: readonly FeatureGroup[];
  readonly projectId: string;
  readonly onNavigateFeatureBoard: (featureId: string) => void;
  readonly onNavigateFeatureDocs: (featureId: string) => void;
  readonly onArchiveSuccess?: () => void;
}
```

## REQ-4: Description in ProgressHeader

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| BoardContent | `board/src/App.tsx:106-152` | Remove standalone description, pass as prop |
| ProgressHeader | `board/src/components/ProgressHeader.tsx` | Accept + render description prop |

### Boundary Definition

**BoardContent**:
- **Input**: roadmap (unchanged)
- **Output**: Pass `description` prop to ProgressHeader

**ProgressHeader**:
- **Input**: Add `description?: string` to props
- **Output**: Render description between stat cards and phase info

### Interface Contract

```typescript
interface ProgressHeaderProps {
  readonly summary: RoadmapSummary;
  readonly currentPhase: number;
  readonly createdAt: string;
  readonly description?: string;  // NEW
}
```

### Layout Contract

**Before**:
```
┌─ProgressHeader ─────────────────────────────────────────┐
│ [Progress %] │ [Done] [InProg] [Pending] │ [Phase info] │
└─────────────────────────────────────────────────────────┘
Description text below (separate element)
```

**After**:
```
┌─ ProgressHeader ────────────────────────────────────────────────────┐
│ [Progress %] │ [Done] [InProg] [Pending] │ Description │ [Phase]   │
└─────────────────────────────────────────────────────────────────────┘
```

## REQ-5: Feature Order Metadata

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| FeatureSummary | `board/shared/types.ts:141-153` | Add `order` field |
| deriveFeatureSummary | `board/server/feature-discovery.ts:39-72` | Extract order from roadmap |
| compareNamesIgnoreCase | `board/src/utils/featureGrouping.ts:30-31` | Sort by order first |

### Boundary Definition

**FeatureSummary type**:
- **Change**: Add `readonly order?: number`
- **Contract**: Optional field, undefined = no order specified

**deriveFeatureSummary**:
- **Input**: roadmap (check `roadmap.roadmap.order`)
- **Output**: FeatureSummary with order populated if present

**featureGrouping**:
- **Input**: Features with optional order
- **Output**: Sorted by order (nulls last), then by name

### Interface Contract

```typescript
// types.ts
interface FeatureSummary {
  // ... existing fields
  readonly order?: number;  // NEW
}

// feature-discovery.ts - deriveFeatureSummary extracts:
//   order: roadmap.roadmap.order

// featureGrouping.ts - compareFeatures logic:
//   1. Compare by order (undefined treated as Infinity)
//   2. If equal order, compare by name
```

## REQ-6: Feature Name as Primary Card Label

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| FeatureCard | `board/src/components/FeatureCard.tsx:95-124` | JSX restructure + style changes |

### Boundary Definition

- **Input**: FeatureSummary (unchanged)
- **Output**: shortDescription as bold primary label, feature-id demoted to small muted text, description removed
- **Invariant**: Click-to-copy functionality preserved on feature-id

### Layout Contract

**Before** (after REQ-2 and step 02-02):
```
┌────────────────────────────────────────┐
│ shortDescription (text-xs gray-400)    │
│ description (text-xs gray-500)         │
│ feature-id (text-sm font-semibold)     │
│ [progress bar]                         │
└────────────────────────────────────────┘
```

**After**:
```
┌────────────────────────────────────────┐
│ shortDescription (font-semibold bold)  │
│ feature-id (text-xs text-gray-500)     │
│ [progress bar]                         │
└────────────────────────────────────────┘
```

### Style Changes

| Element | Before | After |
|---------|--------|-------|
| shortDescription | `text-xs text-gray-400` | `text-sm font-semibold text-gray-100` (promoted to primary) |
| feature-id | `text-sm font-semibold text-gray-100` | `text-xs text-gray-500` (demoted to muted) |
| description | Rendered with `data-testid="feature-full-description"` | REMOVED entirely |

### Fallback Behavior

- When `shortDescription` is undefined or empty: display `feature.name` (feature-id) as the primary bold label
- The demoted feature-id line only renders when shortDescription is present

### Interface Contract

```typescript
// No prop changes - pure JSX restructure and style changes
// hasValidDescription already exists for conditional rendering
```

## REQ-7: FeatureListView Short Name + Feature-ID

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| FeatureListView | `board/src/components/FeatureListView.tsx:86-88` | JSX restructure |

### Boundary Definition

- **Input**: FeatureSummary (unchanged)
- **Output**: Dual-label display: shortDescription (primary bold) + feature.name (secondary muted)
- **Invariant**: Click navigation behavior unchanged

### Layout Contract

**Before**:
```
┌──────────────────────────────────────────────────────────────┐
│ feature.name (font-medium)     │ Status │ Progress           │
└──────────────────────────────────────────────────────────────┘
```

**After**:
```
┌──────────────────────────────────────────────────────────────┐
│ shortDescription (font-medium) feature.name (text-xs muted)  │ Status │ Progress │
└──────────────────────────────────────────────────────────────┘
```

### Fallback Behavior

- When `shortDescription` is undefined or empty: display only `feature.name` as before (no secondary label)

### Interface Contract

```typescript
// No prop changes - pure JSX restructure
// Reuse hasValidDescription from FeatureCard for conditional logic
```

## REQ-8: ViewModeToggle Pointer Cursor

### Affected Components

| Component | File | Change Type |
|-----------|------|-------------|
| ViewModeToggle | `board/src/components/ViewModeToggle.tsx:18-43` | CSS class addition |

### Boundary Definition

- **Input**: ViewModeToggleProps (unchanged)
- **Output**: Toggle buttons display pointer cursor on hover
- **Invariant**: Toggle functionality unchanged

### Change Summary

Add `cursor-pointer` class to both button elements (Card and List buttons).

### Interface Contract

```typescript
// No interface changes - CSS class addition only
```

## Cross-Cutting Concerns

### Type Safety

- `FeatureSummary.order` change propagates through:
  - Backend: feature-discovery.ts
  - Types: shared/types.ts
  - Frontend: any component receiving FeatureSummary

### Testing Boundaries

| Requirement | Unit Test Scope |
|-------------|-----------------|
| REQ-1 | DocViewer renders DocTree with defaultExpanded=false |
| REQ-2 | FeatureCard DOM order (description before feature-id) |
| REQ-3 | ViewModeToggle state changes; ProjectFeatureView conditional render |
| REQ-4 | ProgressHeader renders description when provided |
| REQ-5 | featureGrouping sorts by order; deriveFeatureSummary extracts order |
| REQ-6 | FeatureCard: shortDescription is bold primary, feature-id is muted, description absent |
| REQ-7 | FeatureListView: shortDescription shown as primary, feature.name as secondary muted |
| REQ-8 | ViewModeToggle buttons have cursor-pointer class |

## New Files Summary

| File | Purpose |
|------|---------|
| `board/src/components/ViewModeToggle.tsx` | Card/List toggle control |
| `board/src/components/FeatureListView.tsx` | Compact list rendering |

## Modified Files Summary

| File | Change Summary |
|------|----------------|
| `board/shared/types.ts` | Add `order?: number` to FeatureSummary |
| `board/server/feature-discovery.ts` | Extract order from roadmap metadata |
| `board/src/utils/featureGrouping.ts` | Sort by order field |
| `board/src/components/DocViewer.tsx` | Change defaultExpanded to false |
| `board/src/components/FeatureCard.tsx` | Swap description/feature-id order; REQ-6: shortDescription as primary, remove description |
| `board/src/components/ProjectFeatureView.tsx` | Add view mode state + toggle |
| `board/src/components/ProgressHeader.tsx` | Accept and render description |
| `board/src/App.tsx` | Pass description to ProgressHeader |
| `board/src/components/FeatureListView.tsx` | REQ-7: dual-label display (shortDescription + feature-id) |
| `board/src/components/ViewModeToggle.tsx` | REQ-8: add cursor-pointer to buttons |

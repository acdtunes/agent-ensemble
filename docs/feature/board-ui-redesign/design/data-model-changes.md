# Data Model Changes - board-ui-redesign

## Overview

Single data model change: add `order` field to FeatureSummary for REQ-5.

## FeatureSummary Type Extension

### Current Definition

Location: `board/shared/types.ts:141-153`

```typescript
export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly shortDescription?: string;
  readonly description?: string;
}
```

### Proposed Change

Add optional `order` field:

```typescript
export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly order?: number;  // NEW - feature display order
}
```

## Source Data

### Roadmap Metadata

The `order` value comes from roadmap metadata section:

```yaml
roadmap:
  project_id: my-feature
  order: 1                    # <-- Source of FeatureSummary.order
  short_description: "..."
  description: "..."
```

Or in JSON:

```json
{
  "roadmap": {
    "project_id": "my-feature",
    "order": 1,
    "short_description": "...",
    "description": "..."
  }
}
```

### RoadmapMeta Type

Location: `board/shared/types.ts:59-69`

```typescript
export interface RoadmapMeta {
  readonly project_id?: string;
  readonly created_at?: string;
  readonly total_steps?: number;
  readonly phases?: number;
  readonly status?: string;
  readonly reviewer?: string;
  readonly approved_at?: string;
  readonly short_description?: string;
  readonly description?: string;
  // order?: number - NO CHANGE HERE, already allows arbitrary fields
}
```

RoadmapMeta does not need explicit `order` field since parsing is permissive. Backend extracts it directly in deriveFeatureSummary.

## Backend Extraction

### Current deriveFeatureSummary

Location: `board/server/feature-discovery.ts:39-72`

```typescript
export const deriveFeatureSummary = (
  featureId: FeatureId,
  roadmap: Roadmap | null,
): FeatureSummary => {
  // ... existing logic
  return {
    featureId,
    name: featureId as string,
    hasRoadmap: true,
    // ... other fields
    shortDescription: roadmap.roadmap.short_description,
    description: roadmap.roadmap.description,
    // ADD: order: roadmap.roadmap.order as number | undefined
  };
};
```

## Frontend Sorting

### Current Sorting

Location: `board/src/utils/featureGrouping.ts:30-31`

```typescript
const compareNamesIgnoreCase = (a: FeatureSummary, b: FeatureSummary): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase());
```

### Required Change

New comparison function:

```typescript
const compareByOrderThenName = (a: FeatureSummary, b: FeatureSummary): number => {
  // Order: defined values first, undefined treated as Infinity (last)
  const orderA = a.order ?? Infinity;
  const orderB = b.order ?? Infinity;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // Fallback to name comparison
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
};
```

## Backwards Compatibility

| Scenario | Behavior |
|----------|----------|
| Roadmap without `order` field | `order` undefined, sorted last by name |
| Roadmap with `order: 0` | Sorted first |
| Roadmap with negative `order` | Sorted before positive values |
| Mix of ordered and unordered | Ordered features first (by order), then unordered (by name) |

## Migration

No migration required. Field is optional and backward compatible:
- Existing roadmaps without `order`: features sorted by name (current behavior)
- New/updated roadmaps with `order`: features sorted by order

## API Impact

### HTTP Endpoints

No API changes. FeatureSummary returned from `/api/projects/:id/features` will include `order` if present.

### WebSocket Messages

No protocol changes. `project_list` messages include features with optional `order`.

## Validation

| Constraint | Enforcement |
|------------|-------------|
| Type | Must be number if present |
| Range | Any integer (negative, zero, positive) |
| Uniqueness | Not enforced - duplicate orders allowed |

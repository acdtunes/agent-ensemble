# Feature Description - Data Model Specification

## Generation Inputs

Descriptions are AI-generated from feature documentation during roadmap creation.

### Source Priority Order

| Priority | Path Pattern | Content Extracted |
|----------|--------------|-------------------|
| 1 | `docs/feature/{name}/design/architecture.md` | ## Overview section |
| 2 | `docs/feature/{name}/requirements/requirements.md` | ## Feature Overview section |
| 3 | `docs/feature/{name}/discuss/requirements.md` | Full document (first 2000 chars) |
| 4 | `docs/feature/{name}/discuss/user-stories.md` | All story titles and descriptions |
| 5 | `docs/feature/{name}/discuss/jtbd-job-stories.md` | All job story summaries |
| 6 | (fallback) | Phase names + step names from roadmap |

### Content Extraction Rules

**architecture.md**: Extract text between `## Overview` and next `##` heading.

**requirements.md**: Extract text between `## Feature Overview` and next `##` heading.

**discuss/*.md**: Read first 2000 characters or until first `---` separator.

**Fallback (no docs)**: Concatenate phase and step names:
```
Phase 1: CLI conflict data persistence
  - Write conflicts_with on step start
  - Clear conflicts_with on step complete
Phase 2: Type and mapping passthrough
  ...
```

### Generation Prompt

```
Generate two descriptions for a software feature based on the documentation below.

1. SHORT_DESCRIPTION (max 100 words): A concise summary suitable for a card UI.
   - Focus on WHAT the feature does and its primary benefit
   - Use present tense, active voice
   - Start with a verb or noun, not "This feature..."

2. DESCRIPTION (max 200 words): A detailed summary for a feature header.
   - Include the problem being solved
   - List key capabilities (2-4 bullet points worth)
   - Note scope boundaries if relevant
   - Use present tense, active voice

Documentation:
---
{source_content}
---

Output format (YAML):
short_description: "..."
description: "..."
```

## Source Schema: roadmap.yaml

### Current Structure (unchanged fields)

```yaml
roadmap:
  project_id: string        # Feature identifier
  created_at: string        # ISO 8601 timestamp
  total_steps: number       # Step count
  phases: number            # Phase count
  status: string            # Validation status
  reviewer: string          # Reviewer identifier
  approved_at: string       # Approval timestamp
```

### Extended Structure (new fields)

```yaml
roadmap:
  project_id: string
  short_description: string   # NEW - Max 100 words, displayed on FeatureCard
  description: string         # NEW - Max 200 words, displayed on FeatureBoardView
  created_at: string
  # ... remaining fields unchanged
```

### Field Specifications

| Field | Type | Required | Max Length | Display Location |
|-------|------|----------|------------|------------------|
| short_description | string | No | 100 words | FeatureCard |
| description | string | No | 200 words | FeatureBoardView |

### Example

```yaml
roadmap:
  project_id: conflict-detection
  short_description: "Detect and display file conflicts between concurrent steps"
  description: "This feature adds conflict detection to the board, identifying when multiple in-progress steps modify the same files. Conflicts are computed on step start, persisted to roadmap.yaml, and displayed as badges on StepCard components with hover tooltips showing conflicting step IDs."
  created_at: '2026-03-04T11:56:11Z'
  total_steps: 6
  phases: 3
```

## Type Definitions

### RoadmapMeta (board/shared/types.ts)

```typescript
// CURRENT
export interface RoadmapMeta {
  readonly project_id?: string;
  readonly created_at?: string;
  readonly total_steps?: number;
  readonly phases?: number;
  readonly status?: string;
  readonly reviewer?: string;
  readonly approved_at?: string;
}

// EXTENDED
export interface RoadmapMeta {
  readonly project_id?: string;
  readonly created_at?: string;
  readonly short_description?: string;  // NEW
  readonly description?: string;         // NEW
  readonly total_steps?: number;
  readonly phases?: number;
  readonly status?: string;
  readonly reviewer?: string;
  readonly approved_at?: string;
}
```

### FeatureSummary (board/shared/types.ts)

```typescript
// CURRENT
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
}

// EXTENDED
export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly shortDescription?: string;  // NEW - from roadmap.short_description
  readonly description?: string;        // NEW - from roadmap.description
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
}
```

## Transformation Pipeline

### Parser: validateRoadmapMeta (board/server/parser.ts)

Input: Raw YAML object from `roadmap:` section
Output: `RoadmapMeta` with description fields extracted

```
raw.short_description (string | undefined) -> RoadmapMeta.short_description
raw.description (string | undefined) -> RoadmapMeta.description
```

### Discovery: deriveFeatureSummary (board/server/feature-discovery.ts)

Input: `FeatureId`, `Roadmap | null`
Output: `FeatureSummary` with descriptions from `RoadmapMeta`

```
roadmap.roadmap.short_description -> FeatureSummary.shortDescription
roadmap.roadmap.description -> FeatureSummary.description
```

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| roadmap.yaml without description fields | FeatureSummary has undefined descriptions |
| FeatureCard receives undefined shortDescription | Renders nothing (current behavior) |
| FeatureBoardView receives undefined description | Renders nothing (current behavior) |

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| short_description max 100 words | Advisory (not enforced by parser) |
| description max 200 words | Advisory (not enforced by parser) |
| Fields are optional | Parser returns undefined if missing |
| Fields must be strings | Parser ignores non-string values |

## WebSocket Message Impact

The `ServerWSMessage` type includes `FeatureSummary` via `project_list` message. No changes needed - the extended `FeatureSummary` type flows through automatically.

```typescript
type ServerWSMessage =
  | { type: 'project_list'; projects: readonly ProjectSummary[] }
  // ProjectSummary.features: readonly FeatureSummary[]
  // FeatureSummary now includes shortDescription?, description?
```

# ADR-014: Feature Description Storage and Generation

## Status

Accepted

## Context

The NW-Teams board needs to display feature descriptions:
- **Short description** (max 100 words) on FeatureCard components
- **Detailed description** (max 200 words) at top of FeatureBoardView

Two decisions are required:
1. **Storage location**: Where to persist descriptions
2. **Generation strategy**: How descriptions are created (manual vs AI-generated)

### Constraints
- Project uses functional programming paradigm
- Features already have `docs/feature/{name}/roadmap.yaml`
- Feature discovery scans for roadmap.yaml to determine board display
- Existing parser infrastructure handles YAML with optional fields
- nwave workflow generates documentation in `docs/feature/{name}/` directories

## Decision

### Decision 1: Storage Location

Store feature descriptions in `roadmap.yaml` under the `roadmap:` metadata section as `short_description` and `description` fields.

```yaml
roadmap:
  project_id: example-feature
  short_description: "Brief summary for card display"
  description: "Detailed description for board header"
  created_at: '2026-03-04T10:00:00Z'
```

### Decision 2: Generation Strategy

Descriptions are **AI-generated** from nwave-generated docs during roadmap creation (not manually authored).

**Generation trigger**: During `/nw:roadmap` execution

**Source priority**:
1. `design/architecture.md` (Overview section)
2. `requirements/requirements.md` (Feature Overview section)
3. `discuss/requirements.md` (full document)
4. `discuss/user-stories.md` (story summaries)
5. `discuss/jtbd-job-stories.md` (job story summaries)
6. Fallback: phase/step names from roadmap

**Generator responsibility**: The roadmap generator (solution-architect persona) reads available docs, generates descriptions via LLM prompt, and writes them to roadmap.yaml.

## Alternatives Considered

### Alternative 1: Separate meta.yaml file

**What**: Create `docs/feature/{name}/meta.yaml` containing feature metadata including descriptions.

**Expected Impact**: 100% of problem solved with clean separation of concerns.

**Why Rejected**:
- Adds new file type requiring discovery logic changes
- Features without roadmap already hidden from board (classifyFeatureDisplayState returns null)
- Increases maintenance burden (two files to keep in sync)
- Violates simplest-solution principle (more moving parts)

### Alternative 2: Parse README.md

**What**: Store descriptions in `docs/feature/{name}/README.md` and extract first 1-2 paragraphs.

**Expected Impact**: 80% of problem solved (human-readable, documentation-first).

**Why Rejected**:
- Fragile parsing (markdown structure varies by author)
- No structured validation possible
- Separating short vs detailed description relies on conventions
- Mixing documentation concerns with structured data
- Would require markdown parser in discovery pipeline

### Alternative 3: Manual Authoring

**What**: Require developers to manually write descriptions in roadmap.yaml.

**Expected Impact**: 100% of problem solved but with ongoing effort.

**Why Rejected**:
- Adds friction to roadmap creation workflow
- Descriptions likely to be skipped or low-quality
- Redundant work when docs already contain the information
- AI generation produces consistent quality with zero effort

### Alternative 4: On-Demand Generation Command

**What**: Separate command like `/nw:generate-descriptions` that can be run anytime.

**Expected Impact**: 100% flexible, descriptions updated on demand.

**Why Rejected**:
- Easy to forget, leading to missing descriptions
- Extra step in workflow
- No clear owner (who runs it? when?)
- Simpler to generate at roadmap creation time

### Alternative 5: Lazy Server-Side Generation

**What**: Board server detects missing descriptions and generates them on first view.

**Expected Impact**: 100% automatic, always up-to-date.

**Why Rejected**:
- Adds LLM dependency to board server
- First view latency (~2-5 seconds for LLM call)
- Complicates server architecture (async generation, caching)
- Server becomes stateful (must write back to filesystem)

## Consequences

### Positive
- Zero new file types or discovery logic
- Reuses existing parser infrastructure (validateRoadmapMeta)
- Single source of truth per feature
- Optional fields maintain backward compatibility
- Follows existing pattern (project_id, created_at already in roadmap metadata)

### Negative
- Couples description to roadmap existence (feature must have roadmap.yaml to have description)
- Roadmap file grows slightly larger

### Mitigation
The coupling negative is acceptable because:
1. Features without roadmap.yaml are already hidden from board display
2. Description is specifically for board display, so coupling is logical
3. If decoupling needed later, migration path is straightforward (extract to meta.yaml)

## Implementation Notes

### Generator Integration Point

The description generator integrates into the roadmap creation workflow:

```
/nw:roadmap {feature-id}
    |
    +-- Read feature docs (priority order)
    +-- Generate descriptions (LLM prompt)
    +-- Write roadmap.yaml with descriptions
```

The solution-architect persona owns this generation step. No separate CLI command or server-side logic required.

### Backward Compatibility

Existing roadmaps without descriptions continue to work. The board displays nothing for missing descriptions (graceful degradation). Descriptions can be added to existing roadmaps by re-running `/nw:roadmap` or manually editing the YAML.

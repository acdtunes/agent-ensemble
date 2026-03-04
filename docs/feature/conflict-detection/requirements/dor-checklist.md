# Definition of Ready Checklist: Conflict Detection

## DoR Validation

| # | Criteria | Status | Evidence |
|---|----------|--------|----------|
| 1 | **User story follows INVEST principles** | PASS | Stories are Independent (can be built separately), Negotiable (scope discussed), Valuable (enables worktree planning), Estimable (sized S/M), Small (1-8 points each), Testable (Gherkin criteria) |
| 2 | **Acceptance criteria are testable** | PASS | All AC written in Given-When-Then format with concrete assertions |
| 3 | **Dependencies identified** | PASS | Depends on existing `RoadmapStep.files_to_modify`, `StepCard` component, WebSocket updates |
| 4 | **Technical approach understood** | PASS | Pure function `computeConflictMap()`, memoization strategy, badge component integration documented |
| 5 | **UX/UI designs available** | PASS | Visual mockup in `journey-conflict-visibility-visual.md`, badge placement defined |
| 6 | **Edge cases documented** | PASS | Handled: no conflicts, all done, multiple conflict groups, transitive non-conflicts |
| 7 | **Size estimated** | PASS | US-1: S, US-2: S, US-3: XS, US-4: M, US-5: M |
| 8 | **Business value clear** | PASS | JTBD analysis shows push (late discovery), pull (proactive planning), trigger (merge conflict pain) |

## Validation Details

### 1. INVEST Principles

- **I**ndependent: Each US can be implemented and released separately
- **N**egotiable: Scope refined through decision questions (file-level only, cross-column, etc.)
- **V**aluable: Enables team leads to plan worktree usage proactively
- **E**stimable: Clear scope allows sizing
- **S**mall: Largest story (US-5) is M (5-8 points)
- **T**estable: Every story has Gherkin acceptance criteria

### 2. Testable Acceptance Criteria

All 5 user stories have:
- Given-When-Then scenarios
- Concrete assertions (badge text, visibility, highlight state)
- Edge cases covered (no conflicts, all done, multiple conflicts)

### 3. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| `RoadmapStep.files_to_modify` | Data | Low — already exists |
| `StepCard` component | UI | Low — badge slot exists |
| WebSocket real-time updates | Infra | Low — already working |
| `statusMapping.ts` | Logic | Low — can extend |

### 4. Technical Approach

Documented in `shared-artifacts-registry.md`:
- Single source: `computeConflictMap()`
- Memoization: `useMemo` in `KanbanBoard`
- Data flow: Roadmap → ConflictMap → StepCard props

### 5. UX/UI Designs

- Visual mockup: `journey-conflict-visibility-visual.md`
- Badge design: Amber background, consistent with existing badge styles
- Placement: Below file/dependency chips in card body

### 6. Edge Cases

| Edge Case | Documented In | Handling |
|-----------|---------------|----------|
| No conflicts | `journey-conflict-visibility.yaml` | No badge shown |
| All done | `acceptance-criteria.md` AC-3.1 | Badge hidden |
| Multiple groups | `journey-conflict-visibility.feature` | Independent tracking |
| Self-conflict | `shared-artifacts-registry.md` | Excluded by design |

### 7. Size Estimates

| Story | Size | Rationale |
|-------|------|-----------|
| US-1 | S | Pure function + badge, well-understood |
| US-2 | S | Builds on US-1 conflict map |
| US-3 | XS | Filter adjustment only |
| US-4 | M | Requires tooltip/hover interaction |
| US-5 | M | Requires cross-card state coordination |

### 8. Business Value

From JTBD analysis:
- **Push**: Merge conflicts discovered late, mental tracking burden
- **Pull**: Proactive planning, worktree recommendations
- **Switching trigger**: Painful merge conflict experience

---

## Handoff Readiness

| Item | Status |
|------|--------|
| JTBD artifacts complete | PASS |
| Journey mapped | PASS |
| Requirements documented | PASS |
| User stories with AC | PASS |
| DoR validated | PASS |
| Ready for DESIGN wave | **YES** |

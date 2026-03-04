# Feature Archive - Acceptance Test Review

## Test Coverage Summary

| User Story | Scenarios | Test File | Status |
|------------|-----------|-----------|--------|
| US-01: Archive a Feature | 5 | `archive-http.test.ts` | @skip |
| US-02: View Archived Features | 4 | `archive-http.test.ts`, `archive_ui_steps.test.tsx` | @skip |
| US-03: Restore an Archived Feature | 5 | `archive-http.test.ts`, `archive_ui_steps.test.tsx` | @skip |
| US-04: Confirmation Before Archive | 4 | `archive_ui_steps.test.tsx` | @skip |

**Total Scenarios**: 18
**Test Files**: 4 (walking skeleton + 3 acceptance)

---

## Test Architecture

### Driving Ports Exercised

| Port | Layer | Test Approach |
|------|-------|---------------|
| HTTP API | Server | Injected deps via `MultiProjectHttpDeps` |
| React Components | UI | Props-driven rendering with RTL |

### Dependencies

- **Vitest** - Test runner (existing)
- **@testing-library/react** - Component testing (existing)
- **fetch** - HTTP client for server tests (native)

---

## Implementation Order (Outside-In TDD)

### Phase 1: Walking Skeleton
**File**: `walking_skeleton.test.tsx`
**Unskip**: After types added to `shared/types.ts`

```bash
# Enable walking skeleton test
sed -i '' 's/describe.skip/describe/' board/src/__tests__/acceptance/feature-archive/steps/walking_skeleton.test.tsx
```

### Phase 2: HTTP Routes (US-01, US-02, US-03)
**File**: `archive-http.test.ts`
**Unskip order**:
1. `US-01 Scenario 1.1` - Archive existing feature (happy path)
2. `US-01 Scenario 1.2` - Archive non-existent feature (404)
3. `US-01 Scenario 1.3` - Archive already archived (409)
4. `US-02 Scenario 2.1` - List archived features
5. `US-03 Scenario 3.1` - Restore archived feature

### Phase 3: UI Components (US-02, US-04)
**File**: `archive_ui_steps.test.tsx`
**Unskip order**:
1. `US-04 Scenario 4.1` - Confirmation dialog shown
2. `US-04 Scenario 4.2` - Cancel aborts archive
3. `US-04 Scenario 4.3` - Confirm triggers archive
4. `US-02 Scenario 2.3` - Archived section shows count
5. `US-02 Scenario 2.4` - Archived section collapsed by default

### Phase 4: Integration
**Unskip remaining tests after core flows work**

---

## Acceptance Criteria Checklist

### US-01: Archive a Feature
- [ ] POST endpoint returns 204 for valid feature
- [ ] POST endpoint returns 404 for unknown feature
- [ ] POST endpoint returns 409 for already archived
- [ ] POST endpoint returns 400 for invalid feature ID
- [ ] Feature directory moves from `docs/feature/` to `docs/archive/`

### US-02: View Archived Features
- [ ] GET endpoint returns archived feature list
- [ ] GET endpoint returns empty array for no archives
- [ ] UI shows count in section header
- [ ] UI section collapsed by default
- [ ] UI shows feature names when expanded

### US-03: Restore an Archived Feature
- [ ] POST endpoint returns 204 for valid restore
- [ ] POST endpoint returns 404 for unknown archived feature
- [ ] POST endpoint returns 409 for conflict with active feature
- [ ] Feature directory moves from `docs/archive/` to `docs/feature/`

### US-04: Confirmation Before Archive
- [ ] Dialog shows feature name
- [ ] Cancel closes dialog without API call
- [ ] Confirm triggers archive API
- [ ] Loading state shown during archive

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Filesystem race conditions | Tests use isolated state; production uses atomic `rename()` |
| WebSocket notification timing | Verify via integration test after archive/restore |
| Large archived feature directories | Out of scope; handled by filesystem |

---

## Next Steps

1. **Add types** to `shared/types.ts` (ArchivedFeature, ArchiveError, RestoreError)
2. **Unskip walking skeleton** and implement minimal path resolver
3. **Implement archive-io.ts** with `moveToArchiveFs`
4. **Add HTTP routes** to `index.ts`
5. **Unskip HTTP tests** one at a time
6. **Implement UI components** following test specs
7. **Run full acceptance suite** to verify integration

---

## Handoff to DELIVER Wave

**Ready for**: @nw-functional-software-crafter

**Deliverables**:
- `docs/feature/feature-archive/distill/test-scenarios.md`
- `docs/feature/feature-archive/distill/walking-skeleton.md`
- `board/server/__tests__/archive-http.test.ts`
- `board/src/__tests__/acceptance/feature-archive/steps/*.ts`

**Implementation guidance**:
- Tests are marked `@skip` - unskip as you implement
- Follow Outside-In TDD: types → pure core → IO → routes → UI
- Use existing patterns from `feature-discovery.ts` and `useRemoveProject.ts`

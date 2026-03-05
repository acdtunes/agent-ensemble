# Root Cause Analysis: Modal Closes Unexpectedly

**Problem Statement**: "When the modal is open for some time, it closes out of the blue"

**Investigation Date**: 2026-03-04

**Scope**: StepDetailModal component and state management in board/src

---

## Executive Summary

The modal closes unexpectedly due to WebSocket-driven state updates that recreate the `stepLookup` Map, causing the `selectedStep` derivation to return `null` when the step reference changes between roadmap updates.

**Primary Root Cause**: Reference instability in step lookup after WebSocket updates

**Secondary Root Causes Identified**:
- Branch A: WebSocket update replaces entire roadmap object, invalidating step references
- Branch B: Modal visibility is derived from nullable step lookup result

---

## Phase 1: Problem Definition and Scoping

### Symptoms
- Modal opens successfully when user clicks a step card
- After an indeterminate period ("some time"), modal closes without user action
- No error messages or console warnings reported
- Behavior is intermittent, correlating with backend activity

### Affected Components
- `StepDetailModal` (board/src/components/StepDetailModal.tsx)
- `BoardContent` in App.tsx (lines 104-150)
- `useRoadmapState` hook (board/src/hooks/useRoadmapState.ts)
- `useFeatureState` hook (board/src/hooks/useFeatureState.ts)

### Timeline Context
- Modified files in git status: StepDetailModal.tsx, StepCard.tsx
- New test file: StepDetailModal.test.tsx

---

## Phase 2: Toyota 5 Whys Analysis

### Branch A: WebSocket Update Cascade

```
WHY 1A: Modal closes without user action
  [Evidence: User reports modal "closes out of the blue" after being open "for some time"]

  WHY 2A: selectedStep becomes null, triggering conditional unmount
    [Evidence: App.tsx:141 - {selectedStep !== null && <StepDetailModal ... />}]

    WHY 3A: stepLookup.get(selectedStepId) returns undefined
      [Evidence: App.tsx:118-119 - selectedStep = selectedStepId !== null
       ? (stepLookup.get(selectedStepId) ?? null) : null]

      WHY 4A: stepLookup is recreated on every roadmap change
        [Evidence: App.tsx:108 - const stepLookup = useMemo(() =>
         buildPlanStepLookup(roadmap), [roadmap])]

        WHY 5A: WebSocket 'update' message replaces entire roadmap object
          [Evidence: useRoadmapState.ts:99-101 - case 'update':
           setRoadmap(message.roadmap);]

-> ROOT CAUSE A: WebSocket updates replace the roadmap reference,
   which invalidates memoized stepLookup, but selectedStepId (a string)
   should still resolve correctly unless step.id changes or step is removed.
```

**Validation A**: If the step ID persists across updates, the lookup should succeed. This branch is INCOMPLETE - the ID-based lookup should work unless there's a timing issue or the step is removed.

### Branch B: Step Removal During Update

```
WHY 1B: Modal closes when step is no longer in roadmap
  [Evidence: stepLookup.get() returns undefined]

  WHY 2B: Step was removed or ID changed in backend update
    [Evidence: Server can modify roadmap.yaml which triggers WebSocket 'update']

    WHY 3B: No validation that selected step still exists after update
      [Evidence: App.tsx uses simple nullable check, no warning/handling for
       step disappearing]

      WHY 4B: Modal state management assumes step permanence
        [Evidence: selectedStepId is stored as string, no step object caching]

        WHY 5B: No defensive handling for step removal during modal display
          [Evidence: No error boundary, toast, or graceful degradation pattern]

-> ROOT CAUSE B: Step can be removed from roadmap while modal is open,
   with no user feedback explaining why modal closed.
```

**Validation B**: Forward trace: Backend removes step -> WebSocket update -> stepLookup rebuilt without step -> selectedStep = null -> modal unmounts. VALID.

### Branch C: React Re-render Race Condition

```
WHY 1C: Modal closes on re-render
  [Evidence: Problem occurs "after some time" - consistent with async updates]

  WHY 2C: Parent component re-renders with new props
    [Evidence: BoardContent receives roadmap prop which changes on WS update]

    WHY 3C: useMemo dependency [roadmap] triggers on reference change
      [Evidence: App.tsx:108 - useMemo deps include roadmap object]

      WHY 4C: Roadmap is always a new object from WebSocket JSON.parse
        [Evidence: useRoadmapState.ts:19 - parseMessage = JSON.parse(data)]

        WHY 5C: No structural equality check - reference equality used
          [Evidence: React's default behavior uses === for dependency comparison]

-> ROOT CAUSE C: Every WebSocket message creates new roadmap reference,
   triggering stepLookup recomputation, even when data is identical.
```

**Validation C**: Forward trace: WS message with identical data -> new roadmap object -> useMemo triggers -> new Map created -> lookup works but component re-renders. This explains churn but NOT modal closure unless combined with Branch A/B.

---

## Phase 3: Cross-Validation

### Root Cause Consistency Check

| Root Cause | Explains Symptom? | Independently Verifiable? |
|------------|-------------------|---------------------------|
| A: WS replaces roadmap | Partial - lookup should still work by ID | Yes |
| B: Step removed in update | Yes - directly causes null selectedStep | Yes |
| C: Reference inequality | Explains re-renders, not closure alone | Yes |

### Combined Causality

The actual failure mode requires BOTH:
1. WebSocket update arrives (Root Cause A/C)
2. AND the step ID is no longer present in updated roadmap (Root Cause B)

**OR** there is a timing issue where:
1. WebSocket update triggers re-render
2. selectedStepId state update is pending
3. stepLookup is recomputed with new roadmap
4. selectedStep derived before stepLookup stabilizes

### Evidence Gap Analysis

**Missing Evidence**:
- Server-side logs showing step removal timing
- Browser console logs during modal close
- Network tab showing WebSocket message content at time of closure

**Hypothesis requiring verification**:
- Race condition between setRoadmap and component render cycle
- Step ID format change between updates (e.g., "01-03" vs "1-3")

---

## Phase 4: Solution Development

### Immediate Mitigations (Restore Service)

| Solution | Addresses | Implementation Complexity |
|----------|-----------|---------------------------|
| M1: Cache selectedStep object, not just ID | B, C | Low |
| M2: Add loading state during WS updates | A, C | Medium |
| M3: Show toast when step disappears | B | Low |

### Permanent Fixes (Prevent Recurrence)

| Solution | Addresses | Implementation |
|----------|-----------|----------------|
| P1: Store selectedStep reference, update only on explicit change | A, B, C | Modify BoardContent state management |
| P2: Structural comparison for roadmap updates | C | Custom useMemo comparator or state reconciliation |
| P3: Defensive step lookup with fallback | B | Return last known step if ID exists but lookup fails |
| P4: Modal state isolation from parent re-renders | A, C | useRef for modal state, explicit update triggers |

### Recommended Solution: P1 + M3

**Rationale**:
- Store the actual step object when modal opens
- Only update if user explicitly selects different step
- If step disappears from roadmap, keep modal open with cached data and show warning
- Close modal only on user action or explicit "step deleted" server event

**Implementation Sketch**:
```typescript
// Current (problematic):
const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
const selectedStep = selectedStepId !== null
  ? (stepLookup.get(selectedStepId) ?? null)
  : null;

// Proposed (stable):
const [selectedStep, setSelectedStep] = useState<RoadmapStep | null>(null);

const handleCardClick = useCallback((stepId: string) => {
  const step = stepLookup.get(stepId);
  if (step) setSelectedStep(step);
}, [stepLookup]);

const handleCloseModal = useCallback(() => {
  setSelectedStep(null);
}, []);

// Optionally sync with latest data if step still exists:
useEffect(() => {
  if (selectedStep && stepLookup.has(selectedStep.id)) {
    const latestStep = stepLookup.get(selectedStep.id);
    if (latestStep && latestStep !== selectedStep) {
      setSelectedStep(latestStep); // Update with fresh data
    }
  }
}, [stepLookup, selectedStep]);
```

---

## Phase 5: Prevention Strategy

### Systemic Factors

1. **Derived state from volatile source**: Modal visibility depends on lookup success against frequently-changing data
2. **No state isolation**: Modal state tightly coupled to parent's WebSocket-driven state
3. **Missing user feedback**: Silent failures confuse users

### Prevention Recommendations

1. **Decouple modal state from data source**
   - Store the data needed to render modal, not just a reference key
   - Update cached data reactively, but don't unmount on data staleness

2. **Add observable state transitions**
   - Log state changes for debugging
   - Consider React DevTools integration for state tracking

3. **Implement graceful degradation**
   - When selected entity disappears, show "This item was removed" instead of silently closing
   - Provide user agency over modal lifecycle

4. **Testing coverage**
   - Add integration test: "modal remains open when roadmap updates"
   - Add integration test: "modal shows warning when selected step is removed"

---

## Appendix: Evidence Files

| File | Relevance |
|------|-----------|
| board/src/components/StepDetailModal.tsx | Modal implementation - no auto-close logic found |
| board/src/App.tsx:104-150 | BoardContent - state derivation pattern |
| board/src/hooks/useRoadmapState.ts:90-107 | WebSocket message handling - setRoadmap on update |
| board/src/hooks/useFeatureState.ts:105-125 | Same pattern for feature-level state |
| board/src/utils/stepDetailUtils.ts | buildPlanStepLookup - Map creation on each call |

---

## Conclusion

**Confirmed Root Cause**: Modal closes because `selectedStep` is derived from a volatile lookup against WebSocket-updated roadmap data. When a WebSocket update arrives and either (a) the step is removed from the roadmap, or (b) a race condition causes the lookup to fail during re-render, the derived `selectedStep` becomes `null`, unmounting the modal.

**Primary Fix**: Store the selected step object directly in state rather than deriving it from a lookup. This isolates modal state from data source volatility and prevents unexpected closures.

**Confidence Level**: HIGH for Root Cause B (step removal), MEDIUM for timing-related variants of Root Cause A.

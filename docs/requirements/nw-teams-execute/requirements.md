# Requirements: agent-ensemble:execute Improvements

Epic: Rename, fix review count display, validate files_to_modify at roadmap creation.

## US-01: Rename command from agent-ensemble:deliver to agent-ensemble:execute

**Job Story**: When I look at the command list, I want the team execution command to have a distinct name from nw:deliver, so I can clearly distinguish roadmap creation from roadmap execution.

**Acceptance Criteria (Gherkin)**:

```gherkin
Scenario: Command file reflects new name
  Given the commands directory
  When I list available commands
  Then I see "agent-ensemble:execute" (not "agent-ensemble:deliver")

Scenario: Command references use new name
  Given any file in the codebase referencing "agent-ensemble:deliver"
  When the rename is complete
  Then all references say "agent-ensemble:execute" instead
```

**Scope**: Rename `commands/deliver.md` → `commands/execute.md`. Update all internal references.

---

## US-02: Show review attempts instead of retries

**Job Story**: When I view a file card on the board, I want to see the actual number of reviews (not "retries"), so the count matches what actually happened without implying failure.

**Acceptance Criteria (Gherkin)**:

```gherkin
Scenario: First review shows "1 review" badge
  Given a step with review_attempts = 1
  When the file card renders
  Then the badge reads "1 review"

Scenario: Multiple reviews show plural label
  Given a step with review_attempts = 2
  When the file card renders
  Then the badge reads "2 reviews"

Scenario: Zero reviews hides badge
  Given a step with review_attempts = 0
  When the file card renders
  Then no review badge is displayed

Scenario: Modal shows review attempts label
  Given a step with review_attempts > 0 and timing data
  When the step detail modal renders
  Then the timing section shows "N review attempts" (not "retries")
```

**Scope**:
- `board/src/components/FileCard.tsx`: Change badge text from `"{n} retries"` → `"{n} review"` / `"{n} reviews"` (singular/plural)
- `board/src/components/StepDetailModal.tsx`: Rename label from "review attempts" (already correct label, verify consistency)
- `board/src/utils/statusMapping.ts`: Field stays `retryCount` → rename to `reviewCount` for semantic clarity
- `board/shared/types.ts`: Update `FileCardData.retryCount` → `FileCardData.reviewCount`
- Update all tests

---

## US-03: Validate files_to_modify is non-empty at plan parsing

**Job Story**: When a roadmap is created, I want every step to declare at least one file to modify, so the board can show file-level granularity and conflict detection works correctly.

**Acceptance Criteria (Gherkin)**:

```gherkin
Scenario: Plan step with non-empty files_to_modify parses successfully
  Given a plan YAML with step files_to_modify: ["src/foo.ts"]
  When the plan is parsed
  Then the step is accepted

Scenario: Plan step with empty files_to_modify is rejected
  Given a plan YAML with step files_to_modify: []
  When the plan is parsed
  Then parsing returns an error "step[N].files_to_modify must not be empty"

Scenario: State step with empty files_to_modify still parses (backward compat)
  Given a state YAML with step files_to_modify: []
  When the state is parsed
  Then the step is accepted (state reflects runtime reality)
```

**Scope**:
- `board/server/parser.ts`: In `validatePlanStep`, add length check after `isStringArray` validation
- State validation (`validateStep`) keeps accepting empty arrays — state reflects what actually happened at runtime
- Update parser tests

**Rationale**: The plan is the contract created at roadmap time. If a step doesn't know which files it modifies, the roadmap is incomplete. State YAML is different — it's runtime data where empty is a valid (if undesirable) reality.

# AGENT-ENSEMBLE:EXECUTE — Parallel Feature Execution with Agent Teams

**Command**: `/agent-ensemble:execute`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel feature delivery using Claude Code Agent Teams. You (the Lead) will create a team of crafter and reviewer teammates who work in parallel, messaging each other directly.

## CLI Tools

This command uses deterministic CLI scripts for coordination. The **atomic commands** (start-step, transition, complete-step) are the PRIMARY interface — they update the roadmap directly, preventing the Lead from forgetting status updates.

**Note**: All state is tracked directly in the roadmap file (YAML or JSON) — there is no separate state file. The CLI auto-detects format via `deliver/roadmap.json`, `roadmap.json`, or `roadmap.yaml` in priority order.

```bash
# Set PYTHONPATH for all CLI commands
export PYTHONPATH=$HOME/.claude/lib/python

# --- Setup ---

# Analyze roadmap for parallel groups (displays layer analysis)
# CLI auto-detects format: deliver/roadmap.json, roadmap.json, or roadmap.yaml
python -m agent_ensemble.cli.parallel_groups analyze docs/feature/{project-id}/deliver/roadmap.json

# --- Atomic Commands (MANDATORY — use these, not raw update) ---

# Start a step: checks worktree need → creates worktree if needed → updates roadmap
# Output: "STARTED {step_id} [WORKTREE]" with path, or "STARTED {step_id} [SHARED]"
python -m agent_ensemble.cli.team_state start-step \
  docs/feature/{project-id}/deliver/roadmap.json \
  --step {step_id} \
  --teammate crafter-{step_id}

# Transition step status (e.g. in_progress → review, review → in_progress for revision)
# Updates roadmap atomically
# Optional: --outcome and --feedback record review_history entries
python -m agent_ensemble.cli.team_state transition \
  docs/feature/{project-id}/deliver/roadmap.json \
  --step {step_id} \
  --status {review|in_progress|failed} \
  [--outcome approved|rejected] \
  [--feedback "Reviewer feedback text"]

# Complete a step: sets approved + merges worktree if used
# Output: "COMPLETED {step_id}", "COMPLETED {step_id} MERGE_OK", or "COMPLETED {step_id} MERGE_CONFLICT"
# Optional: --outcome and --feedback record review_history entries before merge
python -m agent_ensemble.cli.team_state complete-step \
  docs/feature/{project-id}/deliver/roadmap.json \
  --step {step_id} \
  [--outcome approved|rejected] \
  [--feedback "Reviewer feedback text"]

# --- Monitoring ---

# Show roadmap progress
python -m agent_ensemble.cli.team_state show docs/feature/{project-id}/deliver/roadmap.json

# Check if a phase is complete
python -m agent_ensemble.cli.team_state check docs/feature/{project-id}/deliver/roadmap.json --phase {phase_id}

# --- Worktree Commands (fallbacks if complete-step merge fails) ---

# List all agent-ensemble worktrees
python -m agent_ensemble.cli.worktree list

# Show detailed worktree status (dirty/clean, commit count)
python -m agent_ensemble.cli.worktree status

# Create a worktree manually (usually done by start-step automatically)
python -m agent_ensemble.cli.worktree create {step_id} [--base BRANCH]

# Merge a single worktree branch
python -m agent_ensemble.cli.worktree merge {step_id} [--into BRANCH]

# Merge all worktree branches in order
python -m agent_ensemble.cli.worktree merge-all [--into BRANCH] [--plan PLAN_PATH]

# Cleanup worktrees (removes worktree dir and branch)
python -m agent_ensemble.cli.worktree cleanup {step_id}
python -m agent_ensemble.cli.worktree cleanup --all
```

## Pre-Flight Check

Before proceeding, verify the feature flag is enabled:

1. Check if agent teams are available by attempting to describe creating a team
2. If not available, instruct the user to enable the feature flag:
   ```json
   // ~/.claude/settings.json
   {
     "env": {
       "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
     }
   }
   ```

## Your Role: Team Lead

You are the **Team Lead** — a Claude AI session that orchestrates but does NOT execute steps directly.

**Your responsibilities**:
- Analyze the roadmap and identify parallel groups
- Create the team and spawn teammates
- Populate the shared task list
- Wait for teammates to complete
- Synthesize results and verify quality
- Clean up the team

**You do NOT**:
- Execute TDD steps yourself (crafters do this)
- Review code yourself (reviewer does this)
- Write implementation code

## Workflow

### Phase 0: Ensure Valid Roadmap (MANDATORY GATE)

**BEFORE any other action**, ensure a valid roadmap exists.

**Step 0a: Check if roadmap exists**

```bash
# Check v2.0.0 location first, then fallbacks
ls docs/feature/{project-id}/deliver/roadmap.json 2>/dev/null || \
ls docs/feature/{project-id}/roadmap.json 2>/dev/null || \
ls docs/feature/{project-id}/roadmap.yaml
```

**If roadmap does NOT exist:**
1. Tell the user to create a roadmap first:
   ```
   Roadmap not found at docs/feature/{project-id}/deliver/roadmap.json (or fallback locations).

   Please create one by running:
     /nw:roadmap @nw-solution-architect "{feature-goal-description}"

   Then re-run /ensemble:execute {project-id}
   ```
2. **STOP. DO NOT proceed without a roadmap.**

**Step 0b: Validate schema**

```bash
# CLI auto-detects format from the path
PYTHONPATH=$HOME/.claude/lib/python python3 -m des.cli.roadmap validate docs/feature/{project-id}/deliver/roadmap.json
```

**Exit codes:**
- `0` = Valid, proceed to Phase 1
- `1` = Invalid schema
- `2` = Usage error

**If validation fails:**
1. Print all errors from the CLI output
2. Tell the user:
   ```
   Roadmap is invalid. Please fix the errors above, or recreate it with:
     /nw:roadmap @nw-solution-architect "{feature-goal-description}"

   Then re-run /ensemble:execute {project-id}
   ```
3. **STOP. DO NOT proceed with an invalid roadmap.**

This gate exists because the parallel_groups CLI is lenient and will accept malformed roadmaps that will cause execution failures later.

### Phase 1: Analyze Roadmap

Use the CLI to analyze the roadmap for parallel execution groups:

```bash
# Analyze and display parallel groups (CLI auto-detects format)
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.parallel_groups analyze docs/feature/{project-id}/deliver/roadmap.json
```

The CLI will output:
```
=== Parallel Execution Analysis ===
Total steps: 4
Layers: 2
Max parallelism: 3 steps
Estimated speedup: 2.0x

Layer 1 (parallel):
  - 01-01: Create user model
  - 01-02: Create user repository
  - 01-03: Create user service

Layer 2 (sequential):
  - 02-01: Create user controller
```

Wait for user confirmation before proceeding.

### Phase 2: Create Team

Ask Claude Code to create an agent team. Use natural language:

```
Create an agent team for parallel feature delivery.
```

### Phase 3: Spawn Teammates

**MAXIMIZE PARALLELISM**: Spawn ALL steps in the current layer simultaneously. If a layer has 4 steps, spawn 4 crafters — not 1 or 2 "to be safe". The entire point of agent-ensemble is parallel execution. Being conservative defeats the purpose.

For each parallel layer, spawn:

**Core Team** (spawn ALL steps at once):
- **N Crafter teammates** (one per step in the layer): Execute TDD cycle
- Reviewers are spawned lazily — see "Reviewer Spawning Protocol" below

**Spawn order**: Spawn ALL crafters in a SINGLE message with multiple Agent tool calls. Do NOT spawn them one at a time.

**IMPORTANT — Agent Tool Usage**:
- Use the `Agent` tool (NOT `Task`) for spawning all teammates
- Crafters MUST use `subagent_type: nw-software-crafter`
- Reviewer MUST use `subagent_type: nw-software-crafter-reviewer`
- Support agents: `nw-researcher`, `nw-troubleshooter`, `nw-platform-architect`
- NEVER use `general-purpose` for crafters or reviewers
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve

**Naming Convention**:
Use the **step_id** as the unique suffix for all teammate names. This avoids collisions across layers since step IDs are globally unique.
- `crafter-{step_id}` ↔ `reviewer-{step_id}`
- Examples: `crafter-02-01` ↔ `reviewer-02-01`, `crafter-02-04` ↔ `reviewer-02-04`

**Pairing Protocol**:
Each crafter is paired 1:1 with a reviewer via the step_id naming convention:
- `crafter-{step_id}` always pairs with `reviewer-{step_id}`
- The reviewer is NOT spawned at crafter spawn time — it is spawned lazily by the Lead when the crafter signals readiness for review (see "Reviewer Spawning Protocol")

**Spawn prompt for Crafter**:

DO NOT dictate implementation details, file contents, or code in the prompt.
Give the crafter the step requirements and let it drive TDD autonomously.

```
Use the Agent tool (subagent_type: nw-software-crafter, name: crafter-{step_id}) with this prompt:

"You are crafter-{step_id} on the {team} team. Project root: {project_root}

Execute step {step_id}: {step_name}

Requirements:
{step_description}

Acceptance criteria:
{acceptance_criteria}

Follow your Outside-In TDD methodology. You own the full cycle:
PREPARE → RED_ACCEPTANCE → RED_UNIT → GREEN → COMMIT

When you reach COMMIT, message the Lead (NOT a reviewer directly):
  'Step {step_id} ready for review. Files: {files_modified}'
The Lead will spawn a reviewer and route the review to you.
If reviewer responds NEEDS_REVISION, address feedback and re-submit to the Lead.
Only mark your task complete after reviewer APPROVED.

Check TaskList after completing for next available work."
```

**Reviewer spawning**: Reviewers are NOT spawned here. See "Reviewer Spawning Protocol" below Phase 4 for when and how the Lead spawns reviewers on demand using the Agent tool.

### Phase 4: Populate Task List and Assign

Create shared task list and assign tasks at spawn time:

```
For each step in the current parallel layer:
- Create task with subject: "Step {step_id}: {step_name}"
- Set blockedBy based on step dependencies
- Assign each task to the crafter spawned for it (set owner in crafter spawn)
```

**IMPORTANT**: Assign tasks to crafters at spawn time. Do NOT let them self-claim — each crafter's spawn prompt already tells it which step to execute. Set the task owner when spawning.

### Reviewer Spawning Protocol

Reviewers are spawned **lazily by the Lead** — only when a crafter signals it is ready for review. This avoids burning context on idle reviewers while crafters are still working.

**When a crafter messages the Lead**: "Step {step_id} ready for review. Files: {files_modified}"

**1st review (reviewer does not exist yet)**:
1. Spawn `reviewer-{step_id}` using the Agent tool with the reviewer prompt below
2. Message the newly spawned reviewer with the crafter's review request (files to review)

**On NEEDS_REVISION (reviewer already running)**:
1. Crafter addresses feedback and messages the Lead again: "Step {step_id} ready for re-review"
2. Lead records rejection in review_history:
   ```bash
   python -m agent_ensemble.cli.team_state transition \
     docs/feature/{project-id}/deliver/roadmap.json \
     --step {step_id} --status in_progress \
     --outcome rejected --feedback "Reviewer feedback summary"
   ```
3. Lead messages the **same already-running `reviewer-{step_id}`** — do NOT re-spawn
4. The reviewer persists across revision cycles

**On APPROVED**:
1. Crafter messages the Lead: "Step {step_id} APPROVED"
2. Lead runs `complete-step` with review outcome (marks approved + records review_history + merges worktree if used):
   ```bash
   python -m agent_ensemble.cli.team_state complete-step \
     docs/feature/{project-id}/deliver/roadmap.json \
     --step {step_id} \
     --outcome approved --feedback "Approved: meets quality standards"
   ```
3. Lead shuts down both crafter and reviewer

**Spawn prompt for Reviewer** (used by Lead when crafter signals readiness):
```
Use the Agent tool (subagent_type: nw-software-crafter-reviewer, name: reviewer-{step_id}, model: opus) with this prompt:

"You are reviewer-{step_id} on the {team} team. Project root: {project_root}

You are paired with crafter-{step_id}. ONLY review work from crafter-{step_id}.

Your role:
- Review crafter work as messages arrive from crafter-{step_id}
- Apply Testing Theater detection (7 deadly patterns)
- Check test quality and coverage
- Respond with APPROVED or NEEDS_REVISION

When crafter-{step_id} messages you:
1. Read the files they mention
2. Check for: TDD discipline (tests exist and are meaningful), type safety, validation correctness, testing theater patterns
3. Respond with one of:
   - 'Step {step_id} APPROVED' — work meets quality standards
   - 'Step {step_id} NEEDS_REVISION: {specific feedback}' — issues to fix

Stay available — crafter-{step_id} may re-submit after revision, or pick up additional tasks.
You are using nw-software-crafter-reviewer methodology."
```

### Phase 5: Monitor and Coordinate

**Tmux pane management**: Tmux has a pane limit. Shut down the reviewer IMMEDIATELY after approval, then shut down the crafter after merge/completion — do NOT let idle teammates accumulate. This frees panes for eager next-layer spawns.

**Eager next-layer spawning**: When a crafter completes and its step unlocks steps in the NEXT layer, check if ALL dependencies for those next-layer steps are now satisfied. If so, spawn a new crafter for the unblocked step immediately — don't wait for the entire current layer to finish. Reviewers spawn on demand when the new crafter signals readiness. This maximizes throughput.

Example: Layer 2 has steps A (dep: 1-1) and B (dep: 1-2, 1-3). If 1-1 finishes first, spawn crafter for A immediately while 1-2 and 1-3 are still running.

**MANDATORY PRE-SPAWN — run `start-step` BEFORE every crafter spawn:**

```bash
# Single atomic command: checks worktree need → creates if needed → updates roadmap
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state start-step \
  docs/feature/{project-id}/deliver/roadmap.json \
  --step {step_id} \
  --teammate crafter-{step_id}
```

**Output determines spawn prompt**:
- `STARTED {step_id} [SHARED]` → use standard spawn prompt (shared directory)
- `STARTED {step_id} [WORKTREE]` + worktree path → use WORKTREE spawn prompt (see "Worktree Isolation" section)

**IMPORTANT**: `start-step` updates the roadmap to `in_progress` BEFORE returning. This means the NEXT `start-step` call will see this step as active and correctly detect file conflicts. You MUST call `start-step` SEQUENTIALLY for each crafter — do NOT batch them. The order matters for conflict detection.

**Sequence for spawning N crafters in a layer:**
1. `start-step` for crafter A → read output (SHARED or WORKTREE)
2. Spawn crafter A with Agent tool using appropriate prompt
3. `start-step` for crafter B → state now shows A as active, detects conflicts correctly
4. Spawn crafter B with Agent tool using appropriate prompt
5. ... repeat for all crafters in the layer

After all `start-step` calls complete, crafters run in parallel — only the startup is sequential.

While teammates are working:

1. **Monitor progress**: Use CLI to track state
   ```bash
   # Show roadmap progress
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state show docs/feature/{project-id}/deliver/roadmap.json

   # Transition step to review when crafter signals readiness
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state transition \
     docs/feature/{project-id}/deliver/roadmap.json \
     --step {step_id} --status review

   # Check if phase is complete
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state check \
     docs/feature/{project-id}/deliver/roadmap.json --phase {phase_id}
   ```

2. **Handle blockers**: If a crafter messages you "Blocked on unknown X":
   - Spawn a researcher teammate to investigate
   - Route findings back to the blocked crafter

3. **Handle failures**: If a step fails twice:
   - Spawn a troubleshooter teammate to investigate
   - Route root cause back to crafter or escalate to user

4. **Handle infra issues**: If build/Docker/CI breaks:
   - Spawn a platform-architect teammate to fix
   - Notify crafters when fixed

**Status Values**:
- `pending` — Not started
- `claimed` — Teammate has claimed the task
- `in_progress` — Work underway
- `review` — Submitted for review
- `approved` — Reviewer approved
- `failed` — Step failed

### Phase 6: Convergence

Wait for all teammates to complete:

1. All crafters idle
2. All steps have reviewer APPROVED
3. All tasks marked complete

Then verify quality:
```bash
# Verify DES integrity
PYTHONPATH=$HOME/.claude/lib/python python -m des.cli.verify_deliver_integrity docs/feature/{project-id}/
```

### Phase 7: Next Layer or Finalize

**With eager spawning, layers blur**: Because you eagerly spawn next-layer steps as soon as their deps are met, there is no clean "layer boundary". Instead of waiting for an entire layer to complete before starting the next, you continuously:
1. Complete the step atomically (updates roadmap + merges worktree):
   ```bash
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state complete-step \
     docs/feature/{project-id}/deliver/roadmap.json \
     --step {step_id}
   ```
2. Shut down the reviewer immediately after approval, then the crafter after completion
3. Check if any new steps are unblocked by this approval
4. If yes, use `start-step` to spawn a fresh crafter via Agent tool (handles worktree detection automatically)
5. `start-step` will detect file conflicts with still-running steps and create worktrees as needed

This means Phases 5-7 are a continuous loop, not discrete stages.

**Why fresh spawns per step**: Each crafter is spawned with a targeted prompt for one specific step. After approval, shut it down. Do NOT try to reassign a crafter to a different step — the original step context in its prompt will cause confusion.

### Phase 7b: Integration Verification (MANDATORY)

**After all implementation steps complete but BEFORE refactoring**, the Lead MUST verify the feature works end-to-end. Reviewer approval of individual steps does NOT guarantee the feature integrates correctly.

**Why this phase exists**: Unit tests and step reviews validate individual components in isolation. They do NOT catch:
- Missing wiring between layers (hooks → API → server → filesystem)
- Props not threaded through component hierarchies
- Response format mismatches between API and consumers
- Dependency injection gaps in server bootstrapping

**Verification checklist**:

1. **Manual smoke test** — Actually use the feature in the running app:
   - Start the dev server if not running
   - Navigate to the relevant UI
   - Exercise the happy path end-to-end
   - Verify the expected behavior occurs

2. **Check integration points** — For each layer boundary in the feature:
   - Frontend hook → API endpoint: Does the hook call the right endpoint? Does it parse the response correctly?
   - API route → server handler: Is the route registered? Are dependencies injected?
   - Server handler → data layer: Are the right functions called with correct parameters?

3. **Verify props threading** — For UI features:
   - Trace required props from top-level container down to leaf components
   - Ensure callbacks are passed through intermediate components
   - Check that conditional rendering logic has all required data

**If issues are found**:
1. Create fix tasks describing the integration gap
2. Assign to an available crafter (spawn a new one if needed)
3. Review and approve the fix
4. Re-run verification

**Only proceed to Phase 8 (Refactoring) after the feature works end-to-end.**

### Phase 8: Refactoring Pass (L1-L3 RPP)

**After all implementation layers complete but BEFORE final cleanup**, run a refactoring pass to clean up the code that was just written. This catches naming issues, long methods, and structural problems while the code is fresh.

**RPP Levels applied**:
- **L1 — Rename**: Unclear names, inconsistent conventions
- **L2 — Extract**: Long methods/functions, duplicated logic
- **L3 — Reshape**: Reorganize within modules, improve internal structure

**Workflow**:

1. **Identify refactoring targets** — Scan the files modified during delivery. Group by module/area:
   ```bash
   # List all files modified during delivery (from roadmap tracking)
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state show docs/feature/{project-id}/deliver/roadmap.json
   ```

2. **Group independent targets** — Files that don't overlap can be refactored in parallel. Files within the same module should go to a single crafter.

3. **Spawn refactoring crafters** — One `nw-software-crafter` per target group. Use the same worktree isolation protocol as delivery. Reviewers are spawned lazily when a refactoring crafter reports completion (same protocol as delivery).

**Refactoring Crafter Template**:
```
Use the Agent tool (subagent_type: nw-software-crafter, name: refactor-{area}, model: opus) with this prompt:

"You are refactor-{area} on the {team} team. Project root: {project_root}

Refactoring pass on recently delivered code. Apply RPP levels L1-L3 ONLY.

Target files:
{files_in_this_area}

L1 — Rename: Fix unclear names, align with project conventions
L2 — Extract: Break long methods, extract duplicated logic
L3 — Reshape: Improve internal module structure

Rules:
1. ALL existing tests MUST continue to pass — refactoring changes structure, not behavior
2. Do NOT add new features, change APIs, or modify behavior
3. Do NOT apply L4+ (Relocate, Rethink, Rewrite) — only cosmetic and structural cleanup
4. Run tests after each change
5. Make small, incremental commits

When done, message the Lead (NOT a reviewer directly):
  'Refactoring {area} complete. Files: {files_modified}'
The Lead will spawn a reviewer and route the review to you.
If reviewer responds NEEDS_REVISION, address feedback and re-submit to the Lead.
Only mark your task complete after reviewer APPROVED.

You are using nw-software-crafter methodology."
```

**Refactoring Reviewer Template** (used by Lead when refactoring crafter signals completion):
```
Use the Agent tool (subagent_type: nw-software-crafter-reviewer, name: refactor-reviewer-{area}, model: opus) with this prompt:

"You are refactor-reviewer-{area} on the {team} team. Project root: {project_root}

You are paired with refactor-{area}. ONLY review work from refactor-{area}.

Your role:
- Verify refactoring is L1-L3 ONLY (no behavior changes, no new features)
- Check that all existing tests still pass
- Validate naming improvements are consistent
- Ensure extractions are clean (no leaky abstractions)
- Confirm no accidental behavior changes

When refactor-{area} messages you:
1. Read the modified files
2. Check for: behavior preservation, L1-L3 scope compliance, test coverage, naming consistency
3. Respond with one of:
   - 'Refactoring {area} APPROVED' — changes are correct and tests pass
   - 'Refactoring {area} NEEDS_REVISION: {specific feedback}' — issues to fix

You are using nw-software-crafter-reviewer methodology."
```

4. **Monitor** — Same as delivery monitoring. Shut down reviewer after approval, then crafter after merge/completion.

5. **Verify** — Run full test suite after all refactoring merges to confirm no regressions.

**Skip conditions**: Skip the refactoring pass only if:
- User explicitly opts out ("skip refactoring")
- Delivery was trivial (single step, few files)

### Phase 9: Finalize

If all layers and refactoring pass complete:
1. Run final verification
2. Clean up the team:
   ```
   Ask all remaining teammates to shut down gracefully.
   Then clean up the team with TeamDelete.
   ```
3. **If TeamDelete fails** (stale members from earlier cycles still in config):
   ```bash
   # Force cleanup: remove team and task directories
   rm -rf ~/.claude/teams/{team-name} ~/.claude/tasks/{team-name}
   ```
4. Report summary to user (including refactoring improvements)

## Worktree Isolation

### When Worktrees Are Used

Worktree detection and creation is handled automatically by `start-step`. The Lead does NOT manually check for conflicts or create worktrees.

**How it works**: `start-step` checks the step's files against all currently active steps in the roadmap. If overlap is found, it creates a worktree before marking the step as in_progress. The output tells the Lead which spawn prompt to use:
- `STARTED {step_id} [SHARED]` → standard spawn prompt
- `STARTED {step_id} [WORKTREE]` + path → worktree spawn prompt (below)

### Worktree Spawn Prompt

When `start-step` outputs `[WORKTREE]`, use this spawn prompt instead of the standard one:

```
Use the Agent tool (subagent_type: nw-software-crafter) with this prompt:

"You are a crafter teammate executing step {step_id}: {step_name}.

IMPORTANT: You are working in an ISOLATED WORKTREE at:
  {worktree_path_from_start_step_output}

Your working directory is this worktree, NOT the main repo.

Your task:
{step_description}

Workflow:
1. Execute the 5-phase TDD cycle in your worktree
2. When you reach COMMIT phase:
   - Commit your changes to your worktree branch (worktree-crafter-{step_id})
   - Message the Lead: 'Step {step_id} ready for review. Files: {files}'
3. The Lead will spawn a reviewer and route the review to you
4. If reviewer responds NEEDS_REVISION, address feedback in your worktree, re-commit, and message the Lead again
5. Only mark task complete after reviewer APPROVED

You are using nw-software-crafter methodology."
```

The reviewer does NOT need a worktree. It can read files from any worktree path to review changes.

### Merge Protocol (Handled by complete-step)

Merges happen **automatically** when `complete-step` is called. The Lead does NOT manually call `merge-on-approve`.

```bash
# Single command: marks approved in roadmap, then merges worktree if used
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state complete-step \
  docs/feature/{project-id}/deliver/roadmap.json \
  --step {step_id}
```

**Output**:
- `COMPLETED {step_id}` — no worktree, done
- `COMPLETED {step_id} MERGE_OK` — worktree merged and cleaned up
- `COMPLETED {step_id} MERGE_CONFLICT` (exit 1) — step is approved but merge failed, worktree preserved

**On MERGE_CONFLICT** (crafter is still alive to help):
1. Read conflicting files — examine the conflict markers
2. Message the crafter to help resolve (they understand their changes best)
3. Resolve and commit:
   ```bash
   git add {resolved_file}
   git merge --continue
   ```
4. Cleanup the worktree manually after resolution:
   ```bash
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree cleanup {step_id}
   ```

**Escalate to User only if:**
- Conflict involves complex business logic Lead cannot judge
- Both versions seem equally valid with different trade-offs
- Conflict affects more than 3 files (high risk)

**Fallback — merge remaining branches at finalization:**
```bash
# Merge all worktree branches (stops on first conflict)
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree merge-all

# Cleanup all worktrees after merge
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree cleanup --all
```

### Step Lifecycle Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                    STEP LIFECYCLE (3 atomic commands)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. START-STEP (atomic)                                          │
│     ├── Checks file conflicts with active steps in roadmap       │
│     ├── Creates worktree if conflicts found                      │
│     ├── Updates roadmap → in_progress                            │
│     └── Output: STARTED [SHARED] or STARTED [WORKTREE] + path   │
│                                                                  │
│  2. SPAWN CRAFTER (Lead uses output to choose prompt)            │
│     └── Standard prompt (shared) or worktree prompt              │
│                                                                  │
│  3. CRAFTER WORKS → signals Lead "ready for review"              │
│                                                                  │
│  4. TRANSITION (atomic) → review                                 │
│     └── Updates roadmap → review                                 │
│                                                                  │
│  5. LEAD SPAWNS REVIEWER → APPROVED or NEEDS_REVISION            │
│     ├── On NEEDS_REVISION: transition --outcome rejected         │
│     │   └── Records review_history entry (cycle, feedback)       │
│     └── On APPROVED: proceed to complete-step                    │
│                                                                  │
│  6. COMPLETE-STEP (atomic) with --outcome approved               │
│     ├── Records review_history entry (cycle, feedback)           │
│     ├── Updates roadmap → approved                               │
│     ├── Merges worktree branch if used (automatic)               │
│     └── Output: COMPLETED, COMPLETED MERGE_OK, or MERGE_CONFLICT│
│                                                                  │
│  7. SHUTDOWN crafter + reviewer                                  │
│                                                                  │
│  8. CHECK UNBLOCKED STEPS → back to step 1 for next step        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Worktree Trade-offs

| Aspect | Shared Directory | Worktree per Crafter |
|--------|------------------|----------------------|
| File conflicts | Immediate overwrites (BAD) | Deferred to merge (SAFE) |
| Setup time | None | ~5s per worktree |
| Disk space | Minimal | ~N × repo size |
| Merge complexity | None | Must merge N branches |
| True parallelism | Only different files | ANY files |

## Support Team Triggers

| Situation | Action |
|-----------|--------|
| Crafter says "Blocked on unknown X" | Spawn nw-researcher teammate |
| Step fails twice | Spawn nw-troubleshooter teammate |
| Build/Docker/CI broken | Spawn nw-platform-architect teammate |

## Error Recovery

| Error | Recovery |
|-------|----------|
| Teammate timeout | Resume or spawn replacement |
| Step fails 3+ times | Escalate to user |
| Merge conflict | Pause team, alert user |
| DES verification fails | Report failed steps, re-execute |

## Example Invocation

```
User: /agent-ensemble:execute auth-feature

Lead (you):
1. Read docs/feature/auth-feature/deliver/roadmap.json (or fallback to roadmap.yaml)
2. Analyze: 3 layers (3 steps, 2 steps, 1 step)
3. Layer 1: spawn 3 crafters via Agent tool (all at once), assign tasks
4. Monitor: as each crafter signals readiness, spawn reviewer via Agent tool on demand, wait for APPROVED
5. Layer 2: spawn 2 new crafters via Agent tool, assign tasks
6. Monitor: spawn reviewers via Agent tool on demand, wait for APPROVED
7. Layer 3: spawn 1 crafter via Agent tool
8. Monitor: spawn reviewer via Agent tool on demand, wait for APPROVED
9. Integration verification: smoke test the feature end-to-end, fix any integration gaps
10. Refactoring pass: group modified files into 2 areas, spawn 2 refactoring crafters via Agent tool (reviewers on demand)
11. Monitor: wait for refactoring APPROVED, run full test suite
12. Clean up team, report summary (including refactoring improvements)
```

## Success Criteria

- [ ] All steps have reviewer APPROVED
- [ ] Integration verification passed (feature works end-to-end)
- [ ] Refactoring pass completed (L1-L3 RPP applied to delivered code)
- [ ] All tests pass after refactoring
- [ ] DES integrity verification passed
- [ ] Team cleaned up properly

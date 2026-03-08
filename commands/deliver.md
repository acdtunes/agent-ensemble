---
description: "Orchestrates the full DELIVER wave end-to-end (roadmap > execute-all > finalize). Use when all prior waves are complete and the feature is ready for implementation."
argument-hint: '[feature-description] - Example: "Implement user authentication with JWT"'
---

# EN-DELIVER: Complete DELIVER Wave Orchestrator

**Wave**: DELIVER (wave 6 of 6)|**Agent**: Main Instance (orchestrator)|**Command**: `/en:deliver "{feature-description}"`

## Overview

Orchestrates complete DELIVER wave: feature description → production-ready code with mandatory quality gates. You (main Claude instance) coordinate by delegating to specialized agents via Agent Teams for parallel execution. Final wave (DISCOVER > DISCUSS > DESIGN > DEVOPS > DISTILL > DELIVER).

Sub-agents cannot use Skill tool or `/en:*` commands. You MUST:
- Read the relevant command file and embed instructions in the Agent prompt
- Remind the crafter to load its skills as needed for the task (skill files are at `skills/{agent-name}/`)

## CRITICAL BOUNDARY RULES

1. **NEVER implement steps directly.** ALL implementation MUST be delegated to the selected crafter (@en-software-crafter or @en-functional-software-crafter per step 1.5) via Agent tool with DES markers. You are ORCHESTRATOR — coordinate, not implement.
2. **NEVER write phase entries to execution-log.json.** Only the crafter subagent that performed TDD work may append entries.
3. **Extract step context from roadmap.json ONLY for Agent prompt.** Grep roadmap for step_id ~50 lines context, extract (description|acceptance_criteria|files_to_modify), pass in DES template.

**DES monitoring is non-negotiable.** Circumventing DES — faking step IDs, omitting markers, or writing log entries manually — is a **violation that invalidates the delivery**. DES detects unmonitored steps and flags them; finalize **blocks** until every flagged step is re-executed through a properly instrumented Task. There is no workaround: unverified steps cannot pass integrity verification, and the delivery cannot be finalized. Without DES monitoring, nWave cannot **verify** TDD phase compliance. For non-deliver tasks (docs, research, one-off edits): `<!-- DES-ENFORCEMENT : exempt -->`.

## Rigor Profile Integration

Before dispatching any agent, read the rigor profile from `.en/des-config.json` (key: `rigor`). If absent, use standard defaults.

**How rigor affects deliver phases:**

| Setting | Effect |
|---------|--------|
| `agent_model` | Pass as `model` parameter to all Agent tool invocations for crafter agents. If `"inherit"`, omit `model` parameter (inherits from session). |
| `reviewer_model` | Pass as `model` parameter to reviewer Agent invocations. If `"skip"`, skip Phase 4 entirely. |
| `review_enabled` | If `false`, skip Phase 4 (Adversarial Review). |
| `double_review` | If `true`, run Phase 4 twice with separate review scopes. |
| `tdd_phases` | Pass to crafter in DES template. Replace `# TDD_PHASES` section with the configured phases. If only `[RED_UNIT, GREEN]`, omit PREPARE/RED_ACCEPTANCE/COMMIT. |
| `refactor_pass` | If `false`, skip Phase 3 (Complete Refactoring). |
| `mutation_enabled` | If `false`, skip Phase 5 regardless of mutation strategy in CLAUDE.md. |

**Teammate naming convention:**
- Crafters: `crafter-{step_id}` (e.g., `crafter-01-01`)
- Reviewers: `reviewer-{step_id}` (e.g., `reviewer-01-01`)

## Orchestration Flow

```
INPUT: "{feature-description}"
  |
  0. Read rigor profile from .en/des-config.json (default: standard)
     Store: agent_model|reviewer_model|tdd_phases|review_enabled|double_review|mutation_enabled|refactor_pass
  |
  1. Parse input|derive feature-id (kebab-case)|create docs/feature/{feature-id}/deliver/
     a. Create execution-log.json if missing via CLI:
        python -m des.cli.init_log --project-dir docs/feature/{feature-id}/deliver --feature-id {feature-id}
        Do NOT create execution-log.json directly with Write — use the CLI only.
     b. Create deliver session marker: .en/des/deliver-session.json
  |
  1.5. Detect development paradigm
     a. Read project CLAUDE.md (project root, NOT ~/.claude/CLAUDE.md)
     b. Search "## Development Paradigm"
     c. Found → extract paradigm: "functional"/@en-functional-software-crafter or "object-oriented"/@en-software-crafter (default)
     d. Not found → ask user "OOP or Functional?"|offer to write to CLAUDE.md
     e. Store selected crafter for all Phase 2 dispatches
     f. Functional → property-based testing default|@property tags signal PBT|example-based = fallback
  |
  1.6. Detect mutation testing strategy
     a. Same CLAUDE.md|search "## Mutation Testing Strategy"
     b. Found → extract: per-feature|nightly-delta|pre-release|disabled
     c. Not found → default "per-feature"
     d. Log strategy for traceability
     Note: Strategy locks at deliver start. CLAUDE.md edits during delivery take effect next run.
  |
  2. Phase 1 — Roadmap Creation + Review
     a. Skip if docs/feature/{feature-id}/deliver/roadmap.json exists with validation.status == "approved"
        IMPORTANT: Only check the deliver/ subdirectory. If roadmap.json is found in design/ instead,
        MOVE it to deliver/ and log warning: "Roadmap relocated from design/ to deliver/ — was created in wrong wave."
     b. @en-solution-architect creates roadmap.json (read commands/roadmap.md)
        Step IDs: NN-NN format (01-01, 01-02, 02-01). 01-A or 1-1 = invalid.
     c. Automated quality gate (see below)
     d. @en-software-crafter-reviewer reviews (read commands/review.md)
     e. Retry once on rejection → stop for manual intervention
  |
  3. Phase 2 — Parallel Execution (Agent Teams + next-steps CLI)

     **MAXIMIZE PARALLELISM**: Spawn ALL ready steps simultaneously. If `next-steps` returns 4 READY steps,
     spawn 4 crafters — not 1 "to be safe". The entire point of en:deliver is parallel execution.
     Being conservative defeats the purpose.

     a. **Interruption recovery**: On resume, run recovery CLI first:
        `python -m en.cli.team_state recover ROADMAP_PATH`
        This resets any in_progress steps back to pending and cleans up orphaned worktrees.
        Approved steps are preserved — only incomplete work is reverted.

     b. **Create agent team**:
        Use TeamCreate to create a delivery team (e.g., `deliver-{feature-id}`).
        This team persists for the entire Phase 2 execution.

     c. **Parallel execution loop** — `next-steps` CLI is the SOLE authority for step ordering (ADR-019).
        Do NOT extract steps from roadmap manually or sort by dependency. Always defer to next-steps.
        ```
        LOOP:
          1. Run: python -m en.cli.team_state next-steps ROADMAP_PATH
             - Output "DONE" → EXIT loop (all steps approved)
             - Output "READY {step_id} {step_name}" lines → collect ALL ready steps

          2. Start ALL ready steps (SEQUENTIAL — conflict detection needs current state):
             For EACH ready step:
               python -m en.cli.team_state start-step ROADMAP --step {step-id} --teammate crafter-{step-id}
               → Record output: SHARED or WORKTREE + path
             IMPORTANT: Call start-step one at a time. Each call sees the previous step
             as active and correctly detects file conflicts for worktree isolation.

          3. Spawn ALL crafters in a SINGLE message (PARALLEL):
             Spawn all crafters simultaneously. For each step, spawn a {selected-crafter}
             teammate named crafter-{step_id} with the DES Prompt Template from execute.md
             (all 9 mandatory sections). See "Crafter Spawn Prompt" below.
             Use standard prompt for SHARED steps, worktree prompt variant for WORKTREE steps.

          4. Monitor crafters (messages arrive automatically in Agent Teams):
             - Crafter messages Lead: "Step {step_id} ready for review. Files: {files}"
               → Lead transitions step to review:
                 python -m en.cli.team_state transition ROADMAP --step {step-id} --status review
               → Lead spawns reviewer lazily (see Reviewer Spawning Protocol below)
             - Reviewer approves:
               → Lead runs complete-step (marks approved + merges worktree if used):
                 python -m en.cli.team_state complete-step ROADMAP --step {step-id} \
                   --outcome approved --feedback "Approved: meets quality standards"
               → Lead shuts down reviewer (SendMessage type: shutdown_request)
               → Lead shuts down crafter (SendMessage type: shutdown_request)
               → This frees tmux panes for new spawns
             - Reviewer rejects:
               → Lead records rejection:
                 python -m en.cli.team_state transition ROADMAP --step {step-id} --status in_progress \
                   --outcome rejected --feedback "Reviewer feedback summary"
               → Lead messages crafter with feedback (crafter revises and re-submits)
               → Reviewer stays alive for re-review (do NOT re-spawn)
             - On crafter failure: do NOT mark step complete. Step stays in_progress.

          5. Eager next-layer spawning:
             After each step completion, call next-steps IMMEDIATELY.
             If newly unblocked steps appear, start-step + spawn them right away.
             Do NOT wait for all current crafters to finish — layers blur.

          6. GOTO 1 (next-steps resolves what is ready next)
        ```

     d. **Timeout recovery**: GREEN completed → resume (~5 turns)|GREEN partial → resume|Otherwise → restart with higher max_turns

     e. **Crafter isolation**: Each crafter is spawned fresh per step via a new teammember invocation.
        No context carries over between steps — each crafter receives only its step's DES template.
        This is by design: steps are independent units of work with explicit inputs (roadmap context)
        and outputs (execution-log entries). Never reuse a crafter agent across steps.

     f. **Shutdown team**: After all steps are approved (next-steps returns DONE):
        - Send shutdown_request to any remaining teammates
        - Use TeamDelete to clean up the team
        - If TeamDelete fails (stale members): `rm -rf ~/.claude/teams/{team-name} ~/.claude/tasks/{team-name}`

     **Merge conflict handling** (complete-step MERGE_CONFLICT):
     - Run `git diff --name-only --diff-filter=U` to list conflicting files
     - If conflicting files < 3 and changes are mechanical (e.g., imports, formatting): attempt auto-resolve via `git checkout --theirs` for non-business files, then `git add` and `git merge --continue`
     - If conflicting files >= 3 OR conflicts involve business logic: STOP and escalate to user with:
       ```
       MERGE CONFLICT in step {step_id}. {N} files conflicting:
       {file list}
       Please resolve manually, then run: git merge --continue
       After resolving, re-run /en:deliver to resume.
       ```
     - NEVER force-resolve ambiguous business logic conflicts automatically

     ### Reviewer Spawning Protocol

     Reviewers are spawned **lazily by the Lead** — only when a crafter signals readiness for review.
     This avoids burning context on idle reviewers while crafters are still working.

     **1st review (reviewer does not exist yet)**:
     1. Spawn an en-software-crafter-reviewer teammate named reviewer-{step_id} with this prompt:

        "You are reviewer-{step_id}. Project root: {project_root}

        You are paired with crafter-{step_id}. ONLY review work from crafter-{step_id}.

        Your role:
        - Review crafter work as messages arrive from crafter-{step_id}
        - Apply Testing Theater detection (7 deadly patterns)
        - Check test quality and coverage
        - Respond with APPROVED or NEEDS_REVISION

        When crafter-{step_id} messages you:
        1. Read the files they mention
        2. Check for: TDD discipline (tests exist and are meaningful), type safety,
           validation correctness, testing theater patterns
        3. Respond with one of:
           - 'Step {step_id} APPROVED' — work meets quality standards
           - 'Step {step_id} NEEDS_REVISION: {specific feedback}' — issues to fix

        Stay available — crafter-{step_id} may re-submit after revision.
        You are using en-software-crafter-reviewer methodology."

     2. Message the reviewer with the crafter's review request (files to review)

     **On NEEDS_REVISION (reviewer already running)**:
     1. Lead messages the **same already-running `reviewer-{step_id}`** — do NOT re-spawn
     2. Crafter addresses feedback and re-submits to the Lead

     **On APPROVED**:
     1. Lead runs `complete-step` with review outcome
     2. Lead shuts down reviewer immediately, then crafter after merge

     ### Worktree Isolation

     Worktree detection is handled automatically by `start-step`. The Lead does NOT manually check conflicts.

     **How it works**: `start-step` checks the step's files against all currently active steps. If overlap
     is found, it creates a worktree. The output tells the Lead which prompt to use:
     - `STARTED {step_id} [SHARED]` → standard crafter prompt
     - `STARTED {step_id} [WORKTREE] {path}` → worktree crafter prompt (below)

     **Worktree crafter prompt variant** — add to standard DES template:
     ```
     IMPORTANT: You are working in an ISOLATED WORKTREE at: {worktree_path}
     Your working directory is this worktree, NOT the main repo.
     Commit to your worktree branch (worktree-crafter-{step_id}).
     The Lead will merge your worktree after review approval.
     ```

     The reviewer does NOT need a worktree — it can read files from any worktree path.

     ### Support Team Triggers

     | Situation | Action |
     |-----------|--------|
     | Crafter says "Blocked on unknown X" | Spawn en-researcher teammate |
     | Step fails twice | Spawn en-troubleshooter teammate |
     | Build/CI broken | Spawn en-platform-architect teammate |
  |
  4. Phase 3 — Complete Refactoring (L1-L4) [SKIP if rigor.refactor_pass = false]
     a. Collect modified files: git diff --name-only {base-commit}..HEAD -- '*.py' | sort -u
        Split: PRODUCTION_FILES (src/) | TEST_FILES (tests/)
     b. /en:refactor {files} --levels L1-L4 via {selected-crafter} with DES orchestrator markers:
        <!-- DES-VALIDATION : required -->|<!-- DES-PROJECT-ID : {feature-id} -->|<!-- DES-MODE : orchestrator -->
     c. All tests green after each module
  |
  5. Phase 4 — Adversarial Review [SKIP if rigor.review_enabled = false]
     a. If rigor.reviewer_model = "skip" → SKIP phase entirely
     b. /en:review @en-software-crafter-reviewer implementation "{execution-log-path}"
        Spawn en-software-crafter-reviewer teammate for review
        Include DES orchestrator markers (same as Phase 3)
     c. If rigor.double_review = true → run review a second time with different scope focus
     d. Scope: ALL files modified during feature|includes Testing Theater 7-pattern detection
     e. One revision pass on rejection → proceed
  |
  6. Phase 5 — Mutation Testing [SKIP if rigor.mutation_enabled = false]
     If rigor.mutation_enabled = false → SKIP regardless of CLAUDE.md strategy
     Otherwise, apply CLAUDE.md strategy:
     per-feature → gate ≥80% kill rate (read commands/mutation-test.md)
     nightly-delta → SKIP|log "handled by CI nightly pipeline"
     pre-release → SKIP|log "handled at release boundary"
     disabled → SKIP|log "disabled per project configuration"
  |
  7. Phase 6 — Deliver Integrity Verification
     TDD integrity MUST pass before finalization. This is a hard gate — no bypass.
     a. PYTHONPATH=src/ python -m des.cli.verify_deliver_integrity docs/feature/{feature-id}/deliver/
     b. Exit 0 → proceed to finalize|Exit 1 → STOP, read output, remediate
     c. Checks performed:
        - Every roadmap step has a matching execution-log.json entry
        - Each entry contains all required TDD phases (per rigor config)
        - No entries = step was not executed through DES → re-dispatch crafter
        - Partial entries = incomplete TDD cycle → re-dispatch crafter for missing phases
        - Phase ordering is valid (PREPARE → RED_ACCEPTANCE → RED_UNIT → GREEN → COMMIT)
        - No manually written entries (DES detects non-CLI-produced entries)
     d. Violations → re-execute failing steps via crafter teammate with DES markers|Only proceed after clean pass
     e. Re-run verification after remediation: loop until exit 0 or escalate after 2 retries
  |
  8. Phase 7 — Finalize
     a. **Archive**: @en-platform-architect archives to docs/evolution/ (read commands/finalize.md)
        - Creates {feature-id}-evolution.md with delivery summary, step outcomes, metrics
     b. **Cleanup**: rm -f .en/des/deliver-session.json .en/des/des-task-active
        - Remove temporary DES session files
        - Orphaned worktrees already cleaned by complete-step in Phase 2
     c. **Report**: Generate delivery report with:
        - Total steps executed and pass/fail breakdown
        - TDD phase compliance per step
        - Review outcomes (if Phase 4 ran)
        - Mutation kill rate (if Phase 5 ran)
        - Files modified (git diff --stat {base-commit}..HEAD)
     d. Commit + push final state
  |
  9. Phase 8 — Retrospective (conditional)
     Skip if clean execution|@en-troubleshooter 5 Whys on issues found
  |
  10. Phase 9 — Report Completion
      Display summary: phases|steps|reviews|artifacts|Return to DISCOVER for next iteration
```

## Orchestrator Responsibilities

Follow this flow directly. Do not delegate orchestration.

Per phase:
1. Read the relevant command file (paths listed above)
2. Extract instructions and embed them in the teammate spawn prompt
3. Include task boundary instructions to prevent workflow continuation
4. Verify output artifacts exist after each teammate completes
5. Update .develop-progress.json for resume capability

## Crafter Spawn Prompt

DES markers required for step execution. Without markers → unmonitored. Full DES Prompt Template (9 sections) in `commands/execute.md`.

When spawning a crafter teammate, use the COMPLETE DES template from execute.md verbatim as the spawn prompt. Fill all `{placeholders}` from roadmap step context. The DES hook validates the prompt BEFORE the teammate starts — abbreviated prompts that delegate template reading to the teammate will be BLOCKED.

Copy the template from the code block in `commands/execute.md` (between ``` markers), fill placeholders, and pass as the teammate's prompt. The template contains 9 mandatory sections: DES_METADATA, AGENT_IDENTITY, SKILL_LOADING, TASK_CONTEXT, TDD_PHASES, QUALITY_GATES, OUTCOME_RECORDING, RECORDING_INTEGRITY, BOUNDARY_RULES, TIMEOUT_INSTRUCTION.

Spawn a {selected-crafter} teammate named crafter-{step_id} with this prompt:

```
<!-- DES-VALIDATION : required -->
<!-- DES-PROJECT-ID : {project_id} -->
<!-- DES-STEP-ID : {step_id} -->

# DES_METADATA
Step: {step_id}
Feature: {project_id}
Command: /en:execute

# AGENT_IDENTITY
Agent: {selected-crafter}

# SKILL_LOADING
Before starting TDD phases, read your skill files for methodology guidance.
Skills path: skills/{agent-name}/
Always load at PREPARE: tdd-methodology.md, quality-framework.md
Load on-demand per phase as specified in your Skill Loading Strategy table.

# TASK_CONTEXT
{step context extracted from roadmap - name|description|acceptance_criteria|test_file|scenario_name|quality_gates|implementation_notes|dependencies|estimated_hours|deliverables}

# TDD_PHASES
... (copy remaining sections from execute.md template verbatim)

# TIMEOUT_INSTRUCTION
Target: 30 turns max. If approaching limit, COMMIT current progress.

When you reach COMMIT, message the Lead (NOT a reviewer directly):
  'Step {step_id} ready for review. Files: {files_modified}'
The Lead will spawn a reviewer and route the review to you.
If reviewer responds NEEDS_REVISION, address feedback and re-submit to the Lead.
```

## Roadmap Quality Gate (Automated, Zero Token Cost)

After roadmap creation, before reviewer:
1. AC coupling: flag AC referencing private methods (`_method()`)
2. Decomposition ratio: flag steps/files > 2.5
3. Identical patterns: flag 3+ steps with same AC structure (batch them)
4. Validation-only: flag steps with no files_to_modify
5. Step ID format: flag non-matching `^\d{2}-\d{2}$`

HIGH findings → return to architect for one revision.

## Skip and Resume

- Check `.develop-progress.json` on start for resume
- Skip if file exists with validation.status == "approved"
- Skip completed steps via execution-log.json COMMIT/PASS
- Max 2 retry per review rejection → stop for manual intervention
- **Interruption recovery**: On resume, Phase 2 runs `python -m en.cli.team_state recover ROADMAP_PATH` which:
  - Resets in_progress/claimed/review steps back to pending
  - Cleans up orphaned worktrees for those steps
  - Preserves approved steps (completed work is kept)
  - This ensures a clean slate for re-execution without losing completed progress

## Input

- `feature-description` (string, required, min 10 chars)
- feature-id: strip prefixes (implement|add|create)|remove stop words|kebab-case|max 5 words

## Output Artifacts

```
docs/feature/{feature-id}/deliver/
  roadmap.json|execution-log.json|.develop-progress.json
docs/evolution/
  {feature-id}-evolution.md
```

## Quality Gates

Roadmap review (1 review, max 2 attempts)|Per-step 5-phase TDD (PREPARE→RED_ACCEPTANCE→RED_UNIT→GREEN→COMMIT)|Paradigm-appropriate crafter|L1-L4 refactoring (Phase 3)|Adversarial review + Testing Theater detection (Phase 4)|Mutation ≥80% if per-feature (Phase 5)|Integrity verification (Phase 6)|All tests passing per phase

## Success Criteria

- [ ] Roadmap created and approved
- [ ] All steps COMMIT/PASS (5-phase TDD)
- [ ] L1-L4 refactoring complete (Phase 3)
- [ ] Adversarial review passed (Phase 4)
- [ ] Mutation gate ≥80% or skipped per strategy (Phase 5)
- [ ] Integrity verification passed (Phase 6)
- [ ] Evolution archived (Phase 7)
- [ ] Retrospective or clean execution noted (Phase 8)
- [ ] Completion report (Phase 9)

## Edge Cases

### Single-Step Roadmap
A roadmap with only one step completes in a single iteration of the next-steps loop:
1. `next-steps` returns `READY 01-01 {name}` → dispatch crafter → complete step
2. `next-steps` returns `DONE` → exit loop
No special handling needed — the reactive loop naturally terminates after one iteration.

### Bottleneck Step Unblocking
When multiple steps depend on a single bottleneck step (e.g., 02-01, 02-02, 02-03 all depend on 01-01):
- After 01-01 is approved via `complete-step`, ALL dependent steps become READY simultaneously
- `next-steps` CLI returns them all as READY in the next invocation
- Spawn all unblocked steps concurrently as crafter teammates
- The orchestrator does NOT need to track dependencies — `next-steps` resolves ordering automatically (ADR-019)

### Crafter Freshness Guarantee
Crafters are spawned fresh per step — no context carryover between steps. This means:
- Each teammate spawn creates a new crafter instance with clean context
- The crafter receives ONLY its step's DES template (roadmap context, AC, files)
- No shared memory, variables, or state between step executions
- If a crafter fails mid-step, the retry also starts fresh (after `recover` resets the step to pending)
- This isolation prevents cross-step contamination: a workaround in step 01-01 cannot silently propagate to 01-02

## Examples

### 1: Fresh Feature
`/en:deliver "Implement user authentication with JWT"` → roadmap → review → TDD all steps → mutation → finalize → report

### 2: Resume After Failure
Same command → loads .develop-progress.json → skips completed → resumes from failure

### 3: Single Step Alternative
For manual granular control, use individual commands:
```
/en:roadmap @en-solution-architect "goal"
/en:execute {selected-crafter} "feature-id" "01-01"
/en:finalize @en-platform-architect "feature-id"
```

## Completion

DELIVER is final wave. After completion → DISCOVER for next feature or mark project complete.

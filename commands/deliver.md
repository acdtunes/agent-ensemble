# AGENT-ENSEMBLE:DELIVER — Parallel Feature Delivery with Agent Teams

**Command**: `/agent-ensemble:deliver`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel feature delivery using Claude Code Agent Teams. You (the Lead) will create a team of crafter and reviewer teammates who work in parallel, messaging each other directly.

## CLI Tools

This command uses deterministic CLI scripts for coordination:

```bash
# Set PYTHONPATH for all CLI commands
export PYTHONPATH=$HOME/.claude/lib/python

# Analyze roadmap for parallel groups
python -m agent_ensemble.cli.parallel_groups analyze docs/feature/{project-id}/roadmap.yaml

# Generate execution plan
python -m agent_ensemble.cli.parallel_groups plan docs/feature/{project-id}/roadmap.yaml --output .agent-ensemble/plan.yaml

# Initialize team state
python -m agent_ensemble.cli.team_state init --plan .agent-ensemble/plan.yaml --output .agent-ensemble/state.yaml

# Create worktrees for parallel steps
python -m agent_ensemble.cli.worktree create {step_id}

# Check if step needs worktree (file conflicts with active steps)
python -m agent_ensemble.cli.team_state should-worktree .agent-ensemble/state.yaml --step {step_id}

# Track step progress (--worktree flag required when conflicts exist)
python -m agent_ensemble.cli.team_state update .agent-ensemble/state.yaml --step {step_id} --status {status} --teammate {teammate_id} [--worktree]

# Check layer completion
python -m agent_ensemble.cli.team_state check .agent-ensemble/state.yaml --layer {layer_num}

# Show team state
python -m agent_ensemble.cli.team_state show .agent-ensemble/state.yaml

# Merge all worktree branches
python -m agent_ensemble.cli.worktree merge-all --plan .agent-ensemble/plan.yaml

# Cleanup worktrees
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

### Phase 1: Analyze Roadmap

Use the CLI to analyze the roadmap and generate an execution plan:

```bash
# Analyze and display parallel groups
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.parallel_groups analyze docs/feature/{project-id}/roadmap.yaml

# Generate execution plan
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.parallel_groups plan docs/feature/{project-id}/roadmap.yaml --output .agent-ensemble/plan.yaml

# Initialize team state tracking
mkdir -p .agent-ensemble
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state init --plan .agent-ensemble/plan.yaml --output .agent-ensemble/state.yaml
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

**MAXIMIZE PARALLELISM**: Spawn ALL steps in the current layer simultaneously. If a layer has 4 steps, spawn 4 crafter+reviewer pairs — not 1 or 2 "to be safe". The entire point of agent-ensemble is parallel execution. Being conservative defeats the purpose.

For each parallel layer, spawn:

**Core Team** (spawn in pairs — ALL steps at once):
- **N Crafter teammates** (one per step in the layer): Execute TDD cycle
- **N Reviewer teammates** (one per crafter): Each crafter gets a dedicated reviewer to avoid bottlenecks

**Spawn order**: Spawn ALL crafter+reviewer pairs in a SINGLE message with multiple Task tool calls. Do NOT spawn them one at a time.

**IMPORTANT — Agent Types and Model**:
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
Each crafter is paired with a dedicated reviewer AT SPAWN TIME using the step_id naming:
- `crafter-{step_id}` always messages `reviewer-{step_id}`
- NEVER change pairings mid-flight. The crafter prompt includes the reviewer name.

**Spawn prompt for Crafter**:

DO NOT dictate implementation details, file contents, or code in the prompt.
Give the crafter the step requirements and let it drive TDD autonomously.

```
Spawn a crafter teammate (subagent_type: nw-software-crafter, name: crafter-{step_id}) with this prompt:

"You are crafter-{step_id} on the {team} team. Project root: {project_root}

Execute step {step_id}: {step_name}

Requirements:
{step_description}

Acceptance criteria:
{acceptance_criteria}

Follow your Outside-In TDD methodology. You own the full cycle:
PREPARE → RED_ACCEPTANCE → RED_UNIT → GREEN → COMMIT

Your dedicated reviewer is reviewer-{step_id}. ALWAYS send reviews to reviewer-{step_id}.
When you reach COMMIT, message reviewer-{step_id}:
  'Step {step_id} ready for review. Files: {files_modified}'
If reviewer responds NEEDS_REVISION, address feedback and re-submit.
Only mark your task complete after reviewer APPROVED.

Check TaskList after completing for next available work."
```

**Spawn prompt for Reviewer**:
```
Spawn a reviewer teammate (subagent_type: nw-software-crafter-reviewer, name: reviewer-{step_id}) with this prompt:

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

### Phase 4: Populate Task List and Assign

Create shared task list and assign tasks at spawn time:

```
For each step in the current parallel layer:
- Create task with subject: "Step {step_id}: {step_name}"
- Set blockedBy based on step dependencies
- Assign each task to the crafter spawned for it (set owner in crafter spawn)
```

**IMPORTANT**: Assign tasks to crafters at spawn time. Do NOT let them self-claim — each crafter's spawn prompt already tells it which step to execute. Set the task owner when spawning.

### Phase 5: Monitor and Coordinate

**Tmux pane management**: Tmux has a pane limit. Shut down completed crafter+reviewer pairs IMMEDIATELY after approval — do NOT let idle teammates accumulate. Send shutdown_request as soon as a step is APPROVED and the crafter confirms completion. This frees panes for eager next-layer spawns.

**Eager next-layer spawning**: When a crafter completes and its step unlocks steps in the NEXT layer, check if ALL dependencies for those next-layer steps are now satisfied. If so, spawn a new crafter+reviewer pair for the unblocked step immediately — don't wait for the entire current layer to finish. This maximizes throughput.

Example: Layer 2 has steps A (dep: 1-1) and B (dep: 1-2, 1-3). If 1-1 finishes first, spawn crafter for A immediately while 1-2 and 1-3 are still running.

**MANDATORY PRE-SPAWN CHECK — run BEFORE every crafter spawn:**

```bash
# 1. Check for conflicts
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state should-worktree .agent-ensemble/state.yaml --step {step_id}

# 2. If WORKTREE_REQUIRED:
#    a. Create worktree
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree create {step_id}
#    b. Mark step with worktree flag when updating status
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .agent-ensemble/state.yaml --step {step_id} --status in_progress --teammate crafter-{step_id} --worktree
#    c. Use the WORKTREE spawn prompt (includes worktree path in "Worktree Isolation" section)

# 3. If NO_WORKTREE_NEEDED:
#    a. Use the standard spawn prompt (shared directory)
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .agent-ensemble/state.yaml --step {step_id} --status in_progress --teammate crafter-{step_id}
```

**IMPORTANT**: The `team_state update --status in_progress` command will BLOCK if file conflicts exist and `--worktree` is not passed. This is a hard gate — you cannot skip it. If blocked, create the worktree first, then retry with `--worktree`.

While teammates are working:

1. **Monitor progress**: Use CLI to track state
   ```bash
   # Show current team state
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state show .agent-ensemble/state.yaml

   # Update step status when teammate reports progress
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .agent-ensemble/state.yaml --step {step_id} --status in_progress --teammate crafter-{step_id}

   # Check if layer is complete
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state check .agent-ensemble/state.yaml --layer 1
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
1. Shut down each crafter+reviewer pair immediately after their step is APPROVED
2. Check if any new steps are unblocked by this approval
3. If yes, spawn fresh crafter+reviewer pair for the unblocked step
4. If file conflicts exist with still-running steps, serialize via `blockedBy`

This means Phases 5-7 are a continuous loop, not discrete stages.

**Why fresh spawns per step**: Each crafter is spawned with a targeted prompt for one specific step. After approval, shut it down. Do NOT try to reassign a crafter to a different step — the original step context in its prompt will cause confusion.

If all layers complete:
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
4. Report summary to user

## Worktree Isolation

### When Worktrees Are Used

**Worktrees are MANDATORY when** (enforced by `team_state update`):
- The target step's `files_to_modify` overlaps with any active (claimed/in_progress/review) step
- The `should-worktree` check returns `WORKTREE_REQUIRED`

**Shared directory is used when** (default):
- No file overlap with active steps (`should-worktree` returns `NO_WORKTREE_NEEDED`)

**Note**: The `team_state update --status in_progress` command enforces this automatically. If conflicts exist and `--worktree` is not passed, the command exits with an error. You cannot skip the check.

### Detecting File Conflicts

The execution plan includes per-step `conflicts_with` annotations (cross-layer):

```bash
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.parallel_groups plan docs/feature/{project-id}/roadmap.yaml --output .agent-ensemble/plan.yaml
```

Plan output for conflicting steps:
```yaml
steps:
  - step_id: "05-02"
    name: "Frontend edit"
    files_to_modify: [BookmarkItem.tsx, useBookmarks.ts, api.ts]
    conflicts_with: ["05-03"]
```

At runtime, use `should-worktree` to check against currently active steps:
```bash
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state should-worktree .agent-ensemble/state.yaml --step {step_id}
```

Output:
```
WORKTREE_REQUIRED
  Conflicts with 05-02: BookmarkItem.tsx, useBookmarks.ts, api.ts
```

### Worktree Setup Protocol

**Step 1: Create worktrees before spawning**

Use the CLI to create worktrees for each crafter:
```bash
# Create worktree for each step in the layer
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree create {step_id}
```

Or manually:
```bash
git worktree add .claude/worktrees/crafter-{step_id} -b worktree-crafter-{step_id}
```

**Step 2: Spawn crafter in worktree**

```
Spawn a crafter teammate with this prompt:

"You are a crafter teammate executing step {step_id}: {step_name}.

IMPORTANT: You are working in an ISOLATED WORKTREE at:
  .claude/worktrees/crafter-{step_id}/

Your working directory is this worktree, NOT the main repo.

Your task:
{step_description}

Workflow:
1. Execute the 5-phase TDD cycle in your worktree
2. When you reach COMMIT phase:
   - Commit your changes to your worktree branch (worktree-crafter-{step_id})
   - Message the reviewer: 'Step {step_id} ready for review. Files: {files}'
3. If reviewer responds NEEDS_REVISION, address feedback in your worktree and re-commit
4. Only mark task complete after reviewer APPROVED

You are using nw-software-crafter methodology."
```

**Step 3: Reviewer works from main repo**

The reviewer teammate does NOT need a worktree. Reviewer can read files from any worktree path to review changes.

### Merge Protocol (After Convergence)

Once all crafters complete and reviewer has APPROVED all steps:

**Step 1: Check worktree status**
```bash
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree status
```

Output:
```
=== agent-ensemble Worktree Status ===

Step 01-01:
  Path: /repo/.claude/worktrees/crafter-01-01
  Branch: worktree-crafter-01-01
  Commits: 3
  Status: clean

Step 01-02:
  Path: /repo/.claude/worktrees/crafter-01-02
  Branch: worktree-crafter-01-02
  Commits: 2
  Status: clean
```

**Step 2: Merge all branches sequentially**
```bash
# Merge all worktree branches in order (uses plan.yaml for ordering)
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree merge-all --plan .agent-ensemble/plan.yaml
```

If conflicts occur, the CLI pauses and reports:
```
MERGE CONFLICT merging worktree-crafter-01-02
Conflicting files:
  src/models/user.ts

Resolve conflicts, then run:
  git add . && git commit
Or abort with:
  git merge --abort
```

**Step 3: Handle merge conflicts**

If `git merge` fails with conflicts, the Lead resolves them:

```bash
# Get list of conflicting files
git diff --name-only --diff-filter=U
```

**Lead Resolution Protocol:**

1. **Read conflicting files** — examine the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)

2. **Understand both sides:**
   - OURS = what was already merged (previous crafter's work)
   - THEIRS = current crafter's work being merged

3. **Resolve intelligently:**
   - If changes are in different parts of the file → combine both
   - If changes overlap but are complementary → merge semantically
   - If changes truly conflict (same line, different logic) → analyze which is correct based on step requirements

4. **Apply resolution:**
   ```bash
   # After editing the file to resolve conflicts
   git add {resolved_file}
   ```

5. **Continue merge:**
   ```bash
   git merge --continue
   ```

**Example Resolution:**

```
<<<<<<< HEAD
function getUser(id: string): User {
  return this.userRepository.findById(id);
}
=======
function getUser(id: string): User | null {
  const user = this.userRepository.findById(id);
  return user ?? null;
}
>>>>>>> worktree-crafter-01-02
```

Lead analyzes: Crafter 01-02's version adds null safety. This is an improvement. Resolve by keeping THEIRS:
```typescript
function getUser(id: string): User | null {
  const user = this.userRepository.findById(id);
  return user ?? null;
}
```

**Escalate to User only if:**
- Conflict involves complex business logic Lead cannot judge
- Both versions seem equally valid with different trade-offs
- Conflict affects more than 3 files (high risk)

```
MERGE CONFLICT - ESCALATING TO USER

I attempted to resolve the conflict but need your input:

File: {filename}
Crafter A (step 01-01) wrote: {description of their change}
Crafter B (step 01-02) wrote: {description of their change}

Both approaches seem valid. Which should we keep?
1. Crafter A's version
2. Crafter B's version
3. Let me show you the diff and you decide
```

**Step 4: Cleanup worktrees after successful merge**
```bash
# Remove all agent-ensemble worktrees and branches
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree cleanup --all
```

Or cleanup a specific step:
```bash
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree cleanup {step_id}
```

### Worktree Lifecycle Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKTREE LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DETECT CONFLICTS                                            │
│     └── Analyze files_to_modify for overlaps                    │
│                                                                 │
│  2. CREATE WORKTREES                                            │
│     └── git worktree add .claude/worktrees/crafter-{id}         │
│                                                                 │
│  3. SPAWN CRAFTERS IN WORKTREES                                 │
│     └── Each crafter works in isolated copy                     │
│                                                                 │
│  4. CRAFTERS COMMIT TO WORKTREE BRANCHES                        │
│     └── worktree-crafter-{step_id}                              │
│                                                                 │
│  5. REVIEWER REVIEWS (from main or worktree paths)              │
│     └── APPROVED or NEEDS_REVISION                              │
│                                                                 │
│  6. MERGE BRANCHES SEQUENTIALLY                                 │
│     └── git merge worktree-crafter-{id} --no-ff                 │
│                                                                 │
│  7. RESOLVE CONFLICTS (if any)                                  │
│     └── Pause, alert user, wait for resolution                  │
│                                                                 │
│  8. CLEANUP WORKTREES                                           │
│     └── git worktree remove + git branch -d                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
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
User: /agent-ensemble:deliver auth-feature

Lead (you):
1. Read docs/feature/auth-feature/roadmap.yaml
2. Analyze: 3 layers (3 steps, 2 steps, 1 step)
3. Layer 1: spawn 3 crafter+reviewer pairs (all at once), assign tasks
4. Monitor: wait for all 3 crafters APPROVED
5. Layer 2: spawn 2 new crafter+reviewer pairs, assign tasks
6. Monitor: wait for all 2 crafters APPROVED
7. Layer 3: spawn 1 crafter+reviewer pair
8. Monitor: wait for APPROVED
9. Clean up team, report summary
```

## Success Criteria

- [ ] All steps have COMMIT/PASS in execution-log
- [ ] All steps have reviewer APPROVED
- [ ] DES integrity verification passed
- [ ] Team cleaned up properly

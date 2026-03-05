# Parallel Refactoring with Agent Teams

**Command**: `/ensemble:refactor`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel refactoring using Claude Code Agent Teams. You (the Lead) will create a team of software crafter teammates, each refactoring a different target in an isolated worktree. This follows the deliver pattern but is focused on refactoring existing code rather than building new features.

## CLI Tools

This command uses the same deterministic CLI scripts as deliver:

```bash
# Set PYTHONPATH for all CLI commands
export PYTHONPATH=$HOME/.claude/lib/python

# Initialize team state (from a manual plan — no roadmap.yaml needed)
python -m agent_ensemble.cli.team_state init --plan .ensemble/plan.yaml --output .ensemble/state.yaml

# Check if step needs worktree (file conflicts with active steps)
python -m agent_ensemble.cli.team_state should-worktree .ensemble/state.yaml --step {step_id}

# Track step progress
python -m agent_ensemble.cli.team_state update .ensemble/state.yaml --step {step_id} --status {status} --teammate {teammate_id} [--worktree]

# Show team state
python -m agent_ensemble.cli.team_state show .ensemble/state.yaml

# Create worktrees for parallel steps
python -m agent_ensemble.cli.worktree create {step_id}

# Merge a single step immediately after approval
python -m agent_ensemble.cli.worktree merge-on-approve {step_id}

# Dry-run preview of all remaining merges
python -m agent_ensemble.cli.worktree merge-all --plan .ensemble/plan.yaml --dry-run

# Merge all remaining worktree branches
python -m agent_ensemble.cli.worktree merge-all --plan .ensemble/plan.yaml [--conflict-aware]

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

You are the **Team Lead** — orchestrate but do NOT refactor code directly.

**Your responsibilities**:
- Analyze the codebase and identify refactoring targets
- Group targets by independence (no shared file modifications)
- Create the execution plan and team
- Spawn crafter+reviewer pairs in worktrees
- Monitor progress and handle merge conflicts
- Verify tests pass on the merged result
- Clean up the team

**You do NOT**:
- Refactor code yourself (crafters do this)
- Review code yourself (reviewers do this)

## Workflow

### Phase 1: Analyze Codebase

Identify refactoring targets. Either:
- **User specifies targets**: "Refactor the auth module and the payment service"
- **Lead analyzes**: Apply RPP levels (L1-L6) to identify improvement areas:
  - L1: Rename (unclear names)
  - L2: Extract (long methods/functions)
  - L3: Reshape (reorganize within module)
  - L4: Relocate (move between modules)
  - L5: Rethink (change abstractions)
  - L6: Rewrite (fundamental redesign)

Present targets to user for confirmation:
```
Refactoring targets identified:

1. target-01: Extract payment validation logic (L2 — Extract)
   Files: src/payment/service.ts, src/payment/validator.ts
2. target-02: Rename user repository methods (L1 — Rename)
   Files: src/user/repository.ts, src/user/service.ts
3. target-03: Reshape notification module (L3 — Reshape)
   Files: src/notifications/*.ts

Targets 1 and 2 are independent (no shared files).
Target 3 is independent of both.
All can run in parallel.
```

### Phase 2: Group Targets

Identify which targets can run in parallel:
- **Independent targets**: No shared file modifications → full parallelism
- **Overlapping targets**: Shared files → must run in separate layers or use worktree isolation

### Phase 3: Generate Plan

Create an execution plan. Since refactoring doesn't use roadmap.yaml, build the plan manually:

```bash
mkdir -p .ensemble
```

Write `.ensemble/plan.yaml` with the target structure:
```yaml
layers:
  - layer: 1
    steps:
      - step_id: "target-01"
        name: "Extract payment validation logic"
        files_to_modify: ["src/payment/service.ts", "src/payment/validator.ts"]
      - step_id: "target-02"
        name: "Rename user repository methods"
        files_to_modify: ["src/user/repository.ts", "src/user/service.ts"]
      - step_id: "target-03"
        name: "Reshape notification module"
        files_to_modify: ["src/notifications/handler.ts", "src/notifications/types.ts"]
```

Initialize state tracking:
```bash
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state init --plan .ensemble/plan.yaml --output .ensemble/state.yaml
```

### Phase 4: Create Team

```
Create an agent team for parallel refactoring.
```

### Phase 5: Pre-Spawn Check

For each target, check for file conflicts and create worktrees if needed:

```bash
# Check each target
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state should-worktree .ensemble/state.yaml --step {step_id}

# If WORKTREE_REQUIRED:
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree create {step_id}
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .ensemble/state.yaml --step {step_id} --status in_progress --teammate crafter-{step_id} --worktree

# If NO_WORKTREE_NEEDED:
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .ensemble/state.yaml --step {step_id} --status in_progress --teammate crafter-{step_id}
```

### Phase 6: Spawn Crafters and Reviewers

**IMPORTANT — Agent Types and Model**:
- Crafters MUST use `subagent_type: nw-software-crafter`
- Reviewers MUST use `subagent_type: nw-software-crafter-reviewer`
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve
- NEVER use `general-purpose` for crafters or reviewers

**Naming Convention**: `crafter-{step_id}` paired with `reviewer-{step_id}`

**MAXIMIZE PARALLELISM**: Spawn ALL crafter+reviewer pairs simultaneously in a SINGLE message with multiple Agent tool calls.

**Crafter Template (shared directory)**:
```
Spawn a crafter teammate (subagent_type: nw-software-crafter, name: crafter-{step_id}, model: opus) with this prompt:

"You are crafter-{step_id} on the {team} team. Project root: {project_root}

Refactoring target {step_id}: {target_name}

RPP Level: {L1-L6}

Target files:
{files_to_modify}

Refactoring goal:
{description of what to refactor and why}

Approach:
- For L1-L3 (simple): Apply standard refactoring patterns
- For L4-L6 (complex): Use Mikado Method — identify the goal, try the change, if tests break, revert and create sub-goals

Rules:
1. ALL existing tests must continue to pass
2. Preserve external behavior — refactoring changes structure, not behavior
3. Make small, incremental commits
4. Run tests after each change

Your dedicated reviewer is reviewer-{step_id}. When done, message reviewer-{step_id}:
  'Target {step_id} refactoring complete. Files: {files_modified}'
If reviewer responds NEEDS_REVISION, address feedback and re-submit.
Only mark your task complete after reviewer APPROVED.

Check TaskList after completing for next available work.

You are using nw-software-crafter methodology."
```

**Crafter Template (worktree — use when `should-worktree` returns WORKTREE_REQUIRED)**:
```
Spawn a crafter teammate (subagent_type: nw-software-crafter, name: crafter-{step_id}, model: opus) with this prompt:

"You are crafter-{step_id} on the {team} team.

IMPORTANT: You are working in an ISOLATED WORKTREE at:
  .claude/worktrees/crafter-{step_id}/

Your working directory is this worktree, NOT the main repo.

Refactoring target {step_id}: {target_name}

RPP Level: {L1-L6}

Target files:
{files_to_modify}

Refactoring goal:
{description of what to refactor and why}

Approach:
- For L1-L3 (simple): Apply standard refactoring patterns
- For L4-L6 (complex): Use Mikado Method

Rules:
1. ALL existing tests must continue to pass
2. Preserve external behavior
3. Make small, incremental commits to your worktree branch (worktree-crafter-{step_id})
4. Run tests after each change

Your dedicated reviewer is reviewer-{step_id}. When done, message reviewer-{step_id}:
  'Target {step_id} refactoring complete. Files: {files_modified}'
If reviewer responds NEEDS_REVISION, address feedback and re-submit.
Only mark your task complete after reviewer APPROVED.

You are using nw-software-crafter methodology."
```

**Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-software-crafter-reviewer, name: reviewer-{step_id}, model: opus) with this prompt:

"You are reviewer-{step_id} on the {team} team. Project root: {project_root}

You are paired with crafter-{step_id}. ONLY review work from crafter-{step_id}.

Your role:
- Review refactoring changes for correctness
- Verify behavior is preserved (no functional changes)
- Check that tests still pass and cover the refactored code
- Validate the refactoring pattern is appropriate (e.g., Extract Method done correctly)
- Detect any accidental behavior changes

When crafter-{step_id} messages you:
1. Read the modified files
2. Check for: behavior preservation, test coverage, code quality improvement, refactoring correctness
3. Respond with one of:
   - 'Target {step_id} APPROVED' — refactoring is correct and tests pass
   - 'Target {step_id} NEEDS_REVISION: {specific feedback}' — issues to fix

Stay available — crafter-{step_id} may re-submit after revision.

You are using nw-software-crafter-reviewer methodology."
```

### Phase 7: Monitor and Merge-on-Approve

Same as deliver — incremental merge when each target is APPROVED:

```bash
# When a crafter's target is APPROVED and used a worktree:
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.team_state update .ensemble/state.yaml --step {step_id} --status approved --teammate crafter-{step_id}

# Merge immediately
PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree merge-on-approve {step_id}
```

**Shut down completed pairs immediately** to free resources for additional targets.

### Phase 8: Finalize

After all targets are approved and merged:

1. **Merge remaining branches** (fallback for any not merged incrementally):
   ```bash
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree merge-all --plan .ensemble/plan.yaml --dry-run
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree merge-all --plan .ensemble/plan.yaml
   ```

2. **Run full test suite** on merged result to verify no regressions

3. **Cleanup worktrees**:
   ```bash
   PYTHONPATH=$HOME/.claude/lib/python python -m agent_ensemble.cli.worktree cleanup --all
   ```

### Phase 9: Cleanup

```
Ask all remaining crafter and reviewer teammates to shut down.
Clean up the team with TeamDelete.
```

If TeamDelete fails (stale members):
```bash
rm -rf ~/.claude/teams/{team-name} ~/.claude/tasks/{team-name}
```

Report summary to user.

## Example Invocation

```
User: /ensemble:refactor "Clean up the auth module — too many god objects"

Lead (you):
1. Analyze: auth module has 3 god objects (AuthService, AuthController, AuthMiddleware)
2. Targets:
   - target-01: Extract token validation from AuthService (L2)
   - target-02: Extract session management from AuthService (L2)
   - target-03: Split AuthController into LoginController + RegisterController (L3)
3. All independent (different files) → full parallelism
4. Create plan, spawn 3 crafter+reviewer pairs in worktrees
5. Monitor: all 3 refactor in parallel, tests pass
6. All APPROVED → merge-on-approve for each
7. Run full test suite → all green
8. Clean up team, report summary
```

## Success Criteria

- [ ] All refactoring targets identified and confirmed with user
- [ ] Targets grouped by independence for maximum parallelism
- [ ] All crafters paired with dedicated reviewers
- [ ] Worktree isolation used where file conflicts exist
- [ ] All targets got reviewer APPROVED
- [ ] All branches merged without regression
- [ ] Full test suite passes on merged result
- [ ] Team cleaned up

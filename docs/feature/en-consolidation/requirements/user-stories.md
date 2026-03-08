# EN Consolidation — User Stories

## US-01: Populate nwave/ vendor directory

**As a** developer using the en: framework
**I want** a pristine copy of the nWave upstream in `nwave/`
**So that** I have a clean sync boundary that can be updated from upstream without conflicts

### Acceptance Criteria

```gherkin
Given the nWave repository at github.com/nWave-ai/nWave
When I populate the nwave/ vendor directory
Then nwave/ contains the following from upstream:
  | Source path                  | Target path            |
  | plugins/nw/commands/         | nwave/commands/        |
  | plugins/nw/agents/           | nwave/agents/          |
  | plugins/nw/skills/           | nwave/skills/          |
  | plugins/nw/scripts/des/      | nwave/scripts/des/     |
  | plugins/nw/scripts/templates/| nwave/scripts/templates/|
And all files are byte-for-byte identical to upstream (no renames, no edits)
And nwave/ is committed to git as a trackable vendor directory
```

### Notes
- nwave/ is NEVER edited manually — only updated via sync script (US-07)
- This is the single source of truth for upstream content

---

## US-02: Rename ensemble package from agent_ensemble to en

**As a** developer using the en: framework
**I want** the existing `src/agent_ensemble/` package renamed to `src/en/`
**So that** the package name matches the `en:` command prefix

### Acceptance Criteria

```gherkin
Given the ensemble CLIs at src/agent_ensemble/
When I rename the package to src/en/
Then the following modules exist under src/en/cli/:
  | Module             | Purpose                        |
  | team_state.py      | Workflow state machine          |
  | parallel_groups.py | Dependency analysis             |
  | worktree.py        | Git worktree management         |
  | migrate_roadmap.py | Roadmap format normalizer       |
And src/en/adapters/ contains roadmap_adapter.py and execlog_adapter.py
And all CLI commands work via python -m en.cli.<module>
And the editable install (pyproject.toml / setup.cfg) is updated for the new package name
And all internal imports are updated from agent_ensemble to en
And en/ may import from des/ but des/ never imports from en/
And src/agent_ensemble/ is deleted
```

---

## US-03: Generate commands/ from nwave/ with en: prefix

**As a** developer using the en: framework
**I want** command definitions generated from `nwave/commands/` into `commands/` with the `en:` prefix
**So that** all slash commands use a consistent, short prefix

### Acceptance Criteria

```gherkin
Given the pristine nWave commands in nwave/commands/
When the sync script generates commands/
Then each command file exists with the en: prefix in its metadata:
  | Source (nwave/commands/) | Target (commands/) | Slash command      |
  | discover.md             | discover.md        | /en:discover       |
  | discuss.md              | discuss.md         | /en:discuss        |
  | design.md               | design.md          | /en:design         |
  | devops.md               | devops.md          | /en:devops         |
  | distill.md              | distill.md         | /en:distill        |
  | execute.md              | execute.md         | /en:execute        |
  | document.md             | document.md        | /en:document       |
  | refactor.md             | refactor.md        | /en:refactor       |
  | review.md               | review.md          | /en:review         |
  | research.md             | research.md        | /en:research       |
  | forge.md                | forge.md           | /en:forge          |
  | diagram.md              | diagram.md         | /en:diagram        |
  | mutation-test.md        | mutation-test.md   | /en:mutation-test  |
  | mikado.md               | mikado.md          | /en:mikado         |
  | root-why.md             | root-why.md        | /en:root-why       |
  | roadmap.md              | roadmap.md         | /en:roadmap        |
  | new.md                  | new.md             | /en:new            |
  | continue.md             | continue.md        | /en:continue       |
  | fast-forward.md         | fast-forward.md    | /en:fast-forward   |
  | finalize.md             | finalize.md        | /en:finalize       |
  | hotspot.md              | hotspot.md         | /en:hotspot        |
  | rigor.md                | rigor.md           | /en:rigor          |
And all internal references to /nw: are replaced with /en:
And all internal references to nw- agent names are replaced with en-
And all skill path references point to skills/ relative to project root
And PYTHONPATH references use src/ within this project
And deliver.md is NOT overwritten (it is a project override, see US-05)
```

---

## US-03b: Generate agents/ from nwave/ with en- prefix

**As a** developer using the en: framework
**I want** agent definitions generated from `nwave/agents/` into `agents/` with the `en-` prefix
**So that** agent system prompts are self-contained with the en- naming convention

### Acceptance Criteria

```gherkin
Given the pristine nWave agents in nwave/agents/
When the sync script generates agents/
Then each agent file is renamed from nw- to en-:
  | Source (nwave/agents/)             | Target (agents/)                   |
  | nw-software-crafter.md            | en-software-crafter.md             |
  | nw-software-crafter-reviewer.md   | en-software-crafter-reviewer.md    |
  | nw-functional-software-crafter.md | en-functional-software-crafter.md  |
  | nw-solution-architect.md          | en-solution-architect.md           |
  | nw-solution-architect-reviewer.md | en-solution-architect-reviewer.md  |
  | nw-product-owner.md               | en-product-owner.md                |
  | nw-product-owner-reviewer.md      | en-product-owner-reviewer.md       |
  | nw-product-discoverer.md          | en-product-discoverer.md           |
  | nw-product-discoverer-reviewer.md | en-product-discoverer-reviewer.md  |
  | nw-acceptance-designer.md         | en-acceptance-designer.md          |
  | nw-acceptance-designer-reviewer.md| en-acceptance-designer-reviewer.md |
  | nw-platform-architect.md          | en-platform-architect.md           |
  | nw-platform-architect-reviewer.md | en-platform-architect-reviewer.md  |
  | nw-researcher.md                  | en-researcher.md                   |
  | nw-researcher-reviewer.md         | en-researcher-reviewer.md          |
  | nw-troubleshooter.md              | en-troubleshooter.md               |
  | nw-troubleshooter-reviewer.md     | en-troubleshooter-reviewer.md      |
  | nw-documentarist.md               | en-documentarist.md                |
  | nw-documentarist-reviewer.md      | en-documentarist-reviewer.md       |
  | nw-data-engineer.md               | en-data-engineer.md                |
  | nw-data-engineer-reviewer.md      | en-data-engineer-reviewer.md       |
  | nw-agent-builder.md               | en-agent-builder.md                |
  | nw-agent-builder-reviewer.md      | en-agent-builder-reviewer.md       |
And all internal references to nw- agent names are replaced with en-
And all skill path references are updated to skills/ relative to project root
And all subagent_type references use en- naming
And all agent frontmatter with "model: inherit" is replaced with "model: claude-opus-4-6"
```

### Notes
- **Agent name collision (confirmed)**: When `nw-software-crafter` is used as `subagent_type` in Agent Teams, Claude Code resolves it to the globally installed plugin version at `~/.claude/agents/nw/nw-software-crafter.md` instead of the project-local copy. The plugin version has `model: inherit` and global skill paths, both of which are broken in teams. Renaming to `en-*` eliminates the collision — Claude Code finds only the project-local definition.
- `model: inherit` does not resolve in agent teams and causes silent spawn failures (agent goes idle immediately, never responds to messages)
- The sync script must replace `model: inherit` with an explicit model ID
- The model ID may need updating when new Claude versions are released
- The `nw-` → `en-` rename is a **functional requirement**, not just cosmetic — without it, agent teams cannot use project-local agent definitions

---

## US-03c: Generate skills/ from nwave/

**As a** developer using the en: framework
**I want** skill files copied from `nwave/skills/` into `skills/`
**So that** agent knowledge files are self-contained within the project

### Acceptance Criteria

```gherkin
Given the pristine nWave skills in nwave/skills/
When the sync script generates skills/
Then the skills directory mirrors the upstream structure (same directories, same files)
And agent definitions reference skills/ relative to project root
And no references to ~/.claude/skills/nw/ remain in any generated file
```

---

## US-04: Delete unused ensemble commands

**As a** developer using the en: framework
**I want** all current ensemble command files removed
**So that** there is no confusion between old ensemble commands and the new en: commands

### Acceptance Criteria

```gherkin
Given the current commands/ directory contains ensemble command files
When I delete the unused commands
Then the following files are removed:
  | File          |
  | audit.md      |
  | debug.md      |
  | discover.md   |
  | document.md   |
  | review.md     |
  | refactor.md   |
  | deliver.md    |
  | design.md     |
  | distill.md    |
  | execute.md    |
And commands/ is clean for the newly generated en: commands
```

---

## US-05: Rewrite en:deliver as parallel team executor

**As a** developer using the en: framework
**I want** `en:deliver` to combine parallel team execution (from ensemble:execute) with DES TDD tracking (from nw:deliver)
**So that** I get parallel crafter execution with TDD compliance enforcement in a single command

### Acceptance Criteria

```gherkin
Given a feature description or existing roadmap
When I run /en:deliver {feature-id}
Then the command:

  # Phase 1: Roadmap (skip if valid roadmap exists)
  - Spawns en-solution-architect to create roadmap
  - Architect declares dependencies based on logical/file coupling only
  - Architect does NOT optimize for parallelism — just declares correct deps
  - Scaffolds via des.cli.roadmap init, fills all TODOs
  - Validates schema and descriptions

  # Phase 2: Parallel execution (Agent Teams, deterministic scheduling)
  - Creates an agent team
  - Lead calls `en.cli.team_state next-steps` to get spawnable steps (deterministic)
  - `next-steps` reads roadmap deps + step statuses, outputs steps with all deps satisfied
  - Lead spawns crafters ONLY for steps returned by `next-steps`
  - Manages worktree isolation via en.cli.team_state start-step
  - Spawns reviewers lazily when crafters signal readiness
  - Tracks workflow state via en.cli.team_state (transition, complete-step)
  - After each step completes, Lead calls `next-steps` again for newly unblocked steps
  - Loop until `next-steps` returns empty (all steps done)

  # Phase 4: DES tracking (throughout execution)
  - Initializes execution-log.json via des.cli.init_log
  - Crafters record TDD phases via des.cli.log_phase
  - Verifies deliver integrity via des.cli.verify_deliver_integrity before finalize

  # Phase 5: Verification and cleanup
  - Runs integration verification (end-to-end smoke test)
  - Runs L1-L4 refactoring pass
  - Runs mutation testing (per rigor profile)
  - Finalizes and archives

  # CLI references
  - Uses python -m des.cli.* for TDD tracking (PYTHONPATH=src)
  - Uses python -m en.cli.* for team orchestration (PYTHONPATH=src)

And en:execute remains as the single-step dispatcher for manual granular control
```

### Notes
- deliver.md is a PROJECT OVERRIDE — the sync script never overwrites it
- en:execute is generated from nwave/commands/execute.md (single-step dispatcher)
- Rigor profiles and mutation testing from nw:deliver should be preserved
- DES markers in crafter prompts must be retained for integrity verification
- **Separation of concerns**: The architect declares correct dependencies (domain knowledge). `team_state next-steps` computes which steps are ready (graph algorithm + status tracking). The Lead must NOT use LLM judgment for execution ordering — it calls `next-steps` and spawns what it returns.
- The architect prompt should say "only add dependencies where there's a real logical or file-level coupling" — NOT "design for maximum parallelization"
- `parallel_groups analyze` remains as an optional preview tool but is NOT used to drive execution
- **Dependency satisfaction**: Only `approved` status counts as "dep satisfied". Steps in `in_progress` or `review` still block dependents. `next-steps` enforces this.
- **Fresh spawns only**: Crafters are spawned per step and shut down after approval. Crafters must NOT self-assign next steps from TaskList. The Lead spawns fresh crafters for each step to avoid context contamination.
- **Abort procedure**: If delivery is interrupted mid-execution, the Lead must: (1) shut down all active crafters/reviewers, (2) clean up worktrees via `worktree cleanup --all`, (3) leave the roadmap as-is (approved steps stay approved, in_progress steps revert to pending on next `en:deliver` run). No merged code is reverted — partial delivery is resumable.
- **Merge conflict escalation**: Lead attempts auto-resolution for simple conflicts (< 3 files). For complex conflicts (>= 3 files or ambiguous logic), Lead blocks and asks the user. No silent resolution of ambiguous conflicts.

---

## US-05b: Add `next-steps` CLI command to team_state

**As a** team Lead (LLM orchestrator)
**I want** a deterministic CLI command that returns which roadmap steps are ready to spawn
**So that** execution ordering is computed by algorithm, not LLM judgment

### Acceptance Criteria

```gherkin
Given a roadmap with step statuses tracked by team_state
When the Lead runs: python -m en.cli.team_state next-steps roadmap.yaml
Then the CLI:
  - Reads all step dependencies and current statuses from the roadmap
  - Computes which steps have ALL dependencies in "approved" status
  - Excludes steps already in_progress, review, approved, or failed
  - Detects file conflicts between returned steps and currently active steps
  - Outputs a list of spawnable step IDs with conflict flags
  - Returns exit 0 with step list, or exit 0 with empty list when all done

Example output:
  READY 01-01 [SHARED]
  READY 01-02 [SHARED]
  READY 01-03 [WORKTREE conflict_with=01-01]
  ---
  DONE (when no steps remain)
```

### Notes
- Replaces `parallel_groups analyze` as the execution driver — `parallel_groups` computed layers upfront, `next-steps` computes incrementally as steps complete
- `parallel_groups analyze` can remain as an optional preview/dry-run tool
- The Lead calls `next-steps` after each step completion to discover newly unblocked work
- File conflict detection reuses existing logic from `start-step`
- This is the **only** way the Lead determines what to spawn — no LLM graph traversal

---

## US-06: Update PYTHONPATH and import references

**As a** developer using the en: framework
**I want** all CLI invocations and imports to use the project's `src/` packages
**So that** the forked packages are loaded from the project, not from global installation

### Acceptance Criteria

```gherkin
Given command files that reference DES or ensemble CLIs
When the commands invoke Python CLI tools
Then all invocations use: PYTHONPATH=src python -m des.cli.*
And all invocations use: PYTHONPATH=src python -m en.cli.*
And no references to $HOME/.claude/lib/python remain
And no references to agent_ensemble.cli.* remain (replaced by en.cli.*)
And no references to ~/.claude/commands/nw/ remain (commands are in commands/)
And no references to ~/.claude/agents/ remain (agents are in agents/)
And no references to ~/.claude/skills/nw/ remain (skills are in skills/)
```

---

## US-07: Create nWave sync automation script

**As a** developer maintaining the en: framework
**I want** a script that automates syncing upstream nWave changes into the project
**So that** I can update from upstream with a single command without manual rename work

### Acceptance Criteria

```gherkin
Given the nWave repository has been updated upstream
When I run scripts/sync-nwave.sh
Then the script:
  1. Downloads the latest nWave release/commit into nwave/ (pristine copy)
  2. Generates commands/ from nwave/commands/:
     - Replaces /nw: with /en: in all content
     - Replaces nw- with en- for agent name references
     - Replaces ~/.claude/skills/nw/ with skills/
     - Replaces $HOME/.claude/lib/python with src/
     - Skips deliver.md (project override)
  3. Generates agents/ from nwave/agents/:
     - Renames files from nw-*.md to en-*.md
     - Replaces nw- with en- in all content
     - Replaces ~/.claude/skills/nw/ with skills/
  4. Copies nwave/skills/ to skills/ (no content transformation needed)
  5. Copies nwave/scripts/des/ to src/des/ (no transformation needed)
  6. Reports what changed (new files, modified files, deleted files)
  7. Writes nwave/VERSION with the upstream tag or commit SHA:
     """
     tag=v2.2.0
     commit=abc123def
     synced_at=2026-03-07T12:00:00Z
     """

And the script is idempotent (running twice produces the same result)
And the script preserves project overrides (deliver.md is never overwritten)
And the script can be run with --dry-run to preview changes without writing
And nwave/VERSION is committed to git alongside the vendor directory
```

### Notes
- The rename rules are simple find-and-replace, applied to file content only:
  - `/nw:` → `/en:`
  - `nw-` → `en-` (for agent names like nw-software-crafter)
  - `~/.claude/skills/nw/` → `skills/`
  - `~/.claude/commands/nw/` → `commands/`
  - `$HOME/.claude/lib/python` → `src`
- File renames: `nw-*.md` → `en-*.md` (agents only)
- Project overrides list (files the script never overwrites): `commands/deliver.md`

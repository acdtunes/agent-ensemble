# JTBD Analysis: agent-ensemble Packaging

## Executive Summary

This analysis identifies four primary jobs users are trying to accomplish when interacting with agent-ensemble packaging: Install, Update, Uninstall, and Configure. Using JTBD methodology (Ulwick's ODI framework), we analyze each job across functional, emotional, and social dimensions, apply Four Forces analysis, and provide opportunity scoring to prioritize implementation.

---

## Job 1: Install agent-ensemble

### Job Story

**When** I discover agent-ensemble and want to try it for team coordination,
**I want to** install it with a single command that "just works",
**so I can** start using team coordination features immediately without fighting with configuration.

### Job Dimensions

**Functional Job**: Get agent-ensemble commands and Python support library into ~/.claude/ in a working state.

**Emotional Job**: Feel confident that installation succeeded and everything is ready. Avoid the frustration of "it should work but doesn't" debugging. Feel the satisfaction of a tool that respects my time.

**Social Job**: Be seen as someone who can adopt new tools efficiently. Recommend agent-ensemble to colleagues without caveat ("it works but setup is tricky").

### Four Forces Analysis

```
        PROGRESS (user installs agent-ensemble)
             ^
             |
Push of  ----+---- Pull of New
Current       |     Solution
Situation     |
             |
        NO PROGRESS (user stays with manual approach)
             ^
             |
Anxiety  ----+---- Habit of
of New        |     Present
Solution      |
```

**Push (demand-generating)**:
- Current install.sh requires cloning repo first -- friction for first-time users
- Symlink approach breaks if repo is moved or deleted
- No version tracking -- unclear what version is installed
- Updates require manual git pull and re-running install.sh

**Pull (demand-generating)**:
- Single command installation: `pipx install agent-ensemble`
- Post-install: `agent-ensemble install` copies files (no symlinks to break)
- Manifest file tracks exactly what was installed
- Works like other professional CLI tools (nWave, gh, aws-cli)

**Anxiety (demand-reducing)**:
- "Will this conflict with my existing ~/.claude/ setup?"
- "What if installation corrupts something and I can't recover?"
- "Will I lose my customizations?"
- "What if pipx isn't installed?"

**Habit (demand-reducing)**:
- Already comfortable with git clone + install.sh workflow
- Know where source files are (can edit directly)
- Some users run from development checkout intentionally

### Assessment
- **Switch likelihood**: HIGH (push is strong, pull aligns with industry patterns)
- **Key blocker**: Anxiety about conflicts/corruption (need backup strategy)
- **Key enabler**: One-command installation matching mental model
- **Design implication**: Create backup before installation, provide clear recovery path

### 8-Step Job Map: Install

| Step | User Activity | Outcome Statements |
|------|--------------|-------------------|
| 1. Define | Decide to try agent-ensemble, understand what it provides | Minimize time to understand what agent-ensemble does |
| 2. Locate | Find installation instructions | Minimize likelihood of finding outdated installation docs |
| 3. Prepare | Ensure pipx is available, check system requirements | Minimize time to set up prerequisites |
| 4. Confirm | Verify I have the right command, check disk space | Minimize likelihood of starting installation with missing prereqs |
| 5. Execute | Run `pipx install agent-ensemble` then `agent-ensemble install` | Minimize time to complete installation |
| 6. Monitor | Watch installation progress, see what's happening | Minimize likelihood of installation hanging without feedback |
| 7. Modify | Handle errors, retry if needed | Minimize time to recover from installation failures |
| 8. Conclude | Verify installation worked, see what was installed | Minimize likelihood of incomplete installation going unnoticed |

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize time to complete installation | 90% | 30% | 15.0 | Extremely Underserved |
| 2 | Minimize likelihood of conflicts with existing setup | 85% | 20% | 13.5 | Underserved |
| 3 | Minimize time to verify installation success | 80% | 35% | 11.5 | Appropriately Served |
| 4 | Minimize likelihood of installation failing silently | 85% | 40% | 10.5 | Appropriately Served |
| 5 | Minimize time to recover from installation failures | 75% | 25% | 11.0 | Appropriately Served |

**Data Quality Note**: Team estimate based on comparison with nWave installation experience and user feedback on current install.sh approach. N=5 internal team members.

---

## Job 2: Update agent-ensemble

### Job Story

**When** I see a new version of agent-ensemble is available (or I'm troubleshooting an issue),
**I want to** update to the latest version with confidence,
**so I can** get new features and bug fixes without losing my workflow or configuration.

### Job Dimensions

**Functional Job**: Replace installed files with newer versions while preserving any user customizations.

**Emotional Job**: Feel confident that update will improve things, not break them. Avoid anxiety about "did it actually update?" or "did I lose something?"

**Social Job**: Stay current with team members using agent-ensemble. Not be "that person" running an old version causing compatibility issues.

### Four Forces Analysis

**Push (demand-generating)**:
- Current approach (git pull + re-run install.sh) doesn't communicate what changed
- No way to know if update is available
- Symlink approach means "update" is just git pull, but version tracking is absent

**Pull (demand-generating)**:
- Clear version comparison: current vs. latest
- Single command: `agent-ensemble update` or `pipx upgrade agent-ensemble`
- See what changed (changelog integration)
- Backup before update, easy rollback if needed

**Anxiety (demand-reducing)**:
- "Will update break my current workflow?"
- "What if new version has bugs?"
- "Will I lose customizations I've made?"

**Habit (demand-reducing)**:
- git pull is familiar
- Can review changes before pulling
- Control over when updates happen

### Assessment
- **Switch likelihood**: MEDIUM-HIGH
- **Key blocker**: Anxiety about breaking changes
- **Key enabler**: Clear version info + backup/rollback capability
- **Design implication**: Show version diff, create backup, provide rollback command

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize likelihood of update breaking existing workflow | 95% | 30% | 16.0 | Extremely Underserved |
| 2 | Minimize time to determine if update is available | 80% | 15% | 13.0 | Underserved |
| 3 | Minimize likelihood of losing customizations during update | 85% | 35% | 10.5 | Appropriately Served |
| 4 | Minimize time to rollback a problematic update | 70% | 10% | 10.6 | Appropriately Served |

---

## Job 3: Uninstall agent-ensemble

### Job Story

**When** I no longer need agent-ensemble (or need to reinstall cleanly),
**I want to** completely remove all installed files,
**so I can** have a clean system without leftover artifacts or confusion about what's installed.

### Job Dimensions

**Functional Job**: Remove all agent-ensemble files from ~/.claude/ and any other locations.

**Emotional Job**: Feel confident the uninstall was complete. No lingering worry about "is something still there?" Clean closure.

**Social Job**: If recommending against agent-ensemble to someone, be able to say "uninstall is clean and complete."

### Four Forces Analysis

**Push (demand-generating)**:
- Current approach: manually find and delete symlinks
- No manifest of what was installed
- Risk of leaving orphaned files or breaking other tools

**Pull (demand-generating)**:
- Single command: `agent-ensemble uninstall`
- Manifest-based removal -- knows exactly what to remove
- Confirmation prompt with list of files to be removed
- Clean exit with summary

**Anxiety (demand-reducing)**:
- "Will this accidentally delete something else?"
- "Will this break other Claude tools?"

**Habit (demand-reducing)**:
- Manual cleanup is familiar
- Know what to delete

### Assessment
- **Switch likelihood**: HIGH (uninstall friction is universally disliked)
- **Key blocker**: Fear of deleting wrong things
- **Key enabler**: Manifest-based removal with preview
- **Design implication**: Show what will be deleted, require confirmation for destructive action

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize likelihood of leftover files after uninstall | 90% | 20% | 16.0 | Extremely Underserved |
| 2 | Minimize likelihood of accidentally deleting non-ensemble files | 95% | 50% | 12.5 | Underserved |
| 3 | Minimize time to verify uninstall was complete | 70% | 30% | 9.4 | Overserved |

---

## Job 4: Configure Installation

### Job Story

**When** I have specific needs (different install location, selective components, dev mode),
**I want to** customize the installation to fit my workflow,
**so I can** use agent-ensemble in a way that integrates with my environment.

### Job Dimensions

**Functional Job**: Control which components are installed, where they go, and how they behave.

**Emotional Job**: Feel that the tool adapts to me, not the other way around. Empowerment over my environment.

**Social Job**: As a power user, demonstrate mastery of the tool. Help others with custom setups.

### Four Forces Analysis

**Push (demand-generating)**:
- Current install.sh is all-or-nothing
- Cannot install only commands without Python library
- Cannot install to non-standard location
- No dev mode for contributors

**Pull (demand-generating)**:
- Selective component installation
- Custom paths via flags or config
- Dev mode with symlinks for active development
- Headless/CI mode without prompts

**Anxiety (demand-reducing)**:
- "Will custom config cause issues later?"
- "Will updates respect my customizations?"

**Habit (demand-reducing)**:
- Edit install.sh manually for customization
- Clone repo and modify directly

### Assessment
- **Switch likelihood**: MEDIUM (smaller user segment, strong pull for those affected)
- **Key blocker**: Uncertainty about custom config durability
- **Key enabler**: Clear documentation, config file that persists
- **Design implication**: Support common customizations via documented flags, preserve config across updates

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize time to configure custom installation | 60% | 15% | 9.0 | Overserved |
| 2 | Minimize likelihood of customizations breaking on update | 75% | 20% | 10.5 | Appropriately Served |
| 3 | Minimize time to set up development mode | 65% | 25% | 8.5 | Overserved |

---

## Opportunity Prioritization Summary

### Extremely Underserved (Score 15+) -- Invest Heavily

1. **Minimize likelihood of update breaking existing workflow** (16.0) -- Update Job
2. **Minimize likelihood of leftover files after uninstall** (16.0) -- Uninstall Job
3. **Minimize time to complete installation** (15.0) -- Install Job

### Underserved (Score 12-15) -- Strong Opportunity

4. **Minimize likelihood of conflicts with existing setup** (13.5) -- Install Job
5. **Minimize time to determine if update is available** (13.0) -- Update Job
6. **Minimize likelihood of accidentally deleting non-ensemble files** (12.5) -- Uninstall Job

### Appropriately Served (Score 10-12) -- Maintain

7-10. Various outcomes around verification, recovery, and rollback

### Overserved (Score <10) -- Simplify/Defer

11. Custom installation configuration (smaller user segment, defer to later iteration)

---

## Walking Skeleton Definition

Based on opportunity scoring, the walking skeleton should deliver end-to-end value for the highest-priority outcomes:

**Walking Skeleton Scope**:
1. `pipx install agent-ensemble` -- install from PyPI
2. `agent-ensemble install` -- copy files to ~/.claude/, create manifest
3. `agent-ensemble uninstall` -- manifest-based removal with preview
4. `agent-ensemble --version` -- show installed version

**Defer to Later**:
- Update command (requires publishing v0.2.0 first)
- Custom configuration options
- Dev mode installation

---

## Cross-References

- Journey design: `docs/ux/packaging/journey-install-visual.md`
- User stories: `docs/requirements/packaging/`
- BDD scenarios: `docs/ux/packaging/journey-install.feature`

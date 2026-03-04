# US-02: Claude Code Integration Installation

## Problem

Carlos Mendez has successfully installed agent-ensemble via pipx, but the commands aren't appearing in Claude Code yet. He's confused because with other tools like nWave, there's a post-install step that "activates" the integration. He finds it frustrating to have a CLI tool installed but not integrated with the environment where he actually uses it. He wishes there was a clear second step that completes the setup and shows him what's now available.

## Who

| User Type | Context | Motivation |
|-----------|---------|------------|
| Developer | After pipx installation | Complete the setup, see what's available |
| Developer | After machine migration | Verify Claude Code integration is working |
| Developer | Troubleshooting | Repair a broken installation |

## Solution

Provide `agent-ensemble install` command that:
1. Checks for and installs the nWave dependency (agent-ensemble depends on nWave for core agent functionality)
2. Copies ensemble commands and Python library to `~/.claude/`
3. Creates a manifest file tracking installed files
4. Displays a summary of what was installed

## Job Story Trace

**Traces to**: Install Job (JTBD Analysis)
> "When I discover agent-ensemble and want to try it for team coordination, I want to install it with a single command that 'just works', so I can start using team coordination features immediately without fighting with configuration."

## Domain Examples

### Example 1: Happy Path -- Fresh installation

Carlos just ran `pipx install agent-ensemble` and now runs the integration step:

```
$ agent-ensemble install

Installing agent-ensemble v0.1.0 to ~/.claude/

[1/4] Checking dependencies...
      nWave not found. Installing dependency...
      Running: pipx install nwave-ai
      Running: nwave-ai install
      nWave v1.2.0 installed successfully.

[2/4] Checking existing installation...
      No existing installation found.

[3/4] Installing components...
      commands/ensemble/  10 commands
      lib/python/agent_ensemble/  Python support library

[4/4] Creating manifest...
      ~/.claude/ensemble-manifest.txt

Done! Installed 10 commands and 1 library.

Available commands:
  /ensemble:deliver   Parallel feature delivery
  /ensemble:review    Multi-perspective code review
  /ensemble:debug     Competing hypotheses debugging
  /ensemble:design    Architecture exploration
  /ensemble:discover  Requirements gathering
  /ensemble:distill   Acceptance criteria refinement
  /ensemble:document  Documentation generation
  /ensemble:execute   Task execution
  /ensemble:refactor  Code refactoring
  /ensemble:audit     Code audit

Try: /ensemble:review in Claude Code
```

Carlos feels confident -- he knows exactly what was installed and can try the first command immediately.

### Example 1b: Happy Path -- nWave already installed

Carlos already has nWave from a previous project:

```
$ agent-ensemble install

Installing agent-ensemble v0.1.0 to ~/.claude/

[1/4] Checking dependencies...
      nWave v1.2.0 already installed. Skipping.

[2/4] Checking existing installation...
      No existing installation found.

[3/4] Installing components...
      commands/ensemble/  10 commands
      lib/python/agent_ensemble/  Python support library

[4/4] Creating manifest...
      ~/.claude/ensemble-manifest.txt

Done! Installed 10 commands and 1 library.
```

The installer detects existing nWave and skips redundant installation.

### Example 2: Edge Case -- Upgrade from previous version

Carlos has v0.0.9 installed and runs the installer with v0.1.0:

```
$ agent-ensemble install

Installing agent-ensemble v0.1.0 to ~/.claude/

[1/4] Checking dependencies...
      nWave v1.2.0 already installed. Skipping.

[2/4] Checking existing installation...
      Found existing installation: v0.0.9
      Creating backup at ~/.claude/ensemble-backup-20260304-143022/

[3/4] Installing components...
      commands/ensemble/  10 commands (updated)
      lib/python/agent_ensemble/  Python support library (updated)

[4/4] Updating manifest...
      ~/.claude/ensemble-manifest.txt

Done! Updated from v0.0.9 to v0.1.0.

To rollback: agent-ensemble rollback
```

Carlos appreciates the automatic backup -- he can rollback if something breaks.

### Example 3: Edge Case -- Existing unrelated files preserved

Carlos has custom agents and commands in `~/.claude/`:

```
$ ls ~/.claude/
agents/
commands/
  my-custom-command.md
lib/
settings.json
```

After running `agent-ensemble install`:

```
$ ls ~/.claude/
agents/
commands/
  ensemble/          <- new directory
  my-custom-command.md  <- preserved
ensemble-manifest.txt  <- new file
lib/
  python/
    agent_ensemble/  <- new directory
settings.json         <- preserved
```

Carlos's custom files are untouched.

### Example 4: Error Case -- nWave installation fails

Carlos tries to install but nWave installation fails:

```
$ agent-ensemble install

Installing agent-ensemble v0.1.0 to ~/.claude/

[1/4] Checking dependencies...
      nWave not found. Installing dependency...
      Running: pipx install nwave-ai

Error: Failed to install nWave dependency

  nWave is required for agent-ensemble to function.
  The automatic installation failed with:
    pipx: command not found

  Manual installation:
    1. Install pipx: pip install pipx --user && pipx ensurepath
    2. Restart your terminal
    3. Run: pipx install nwave-ai && nwave-ai install
    4. Re-run: agent-ensemble install

```

Carlos gets clear instructions to install nWave manually if automatic installation fails.

### Example 5: Error Case -- Permission denied

Carlos's `~/.claude/` directory has wrong permissions:

```
$ agent-ensemble install

Error: Cannot write to ~/.claude/

  The directory ~/.claude/ exists but is not writable.

  Try:
    1. Check permissions: ls -la ~/.claude/
    2. Fix ownership: sudo chown -R $USER ~/.claude/

```

Carlos gets actionable steps to fix the problem.

## UAT Scenarios (BDD)

### Scenario 1: Fresh installation to Claude Code

```gherkin
Scenario: Developer completes Claude Code integration
  Given Carlos Mendez has installed agent-ensemble 0.1.0 via pipx
  And no previous ensemble installation exists in ~/.claude/
  And nWave is not installed
  When Carlos runs "agent-ensemble install"
  Then the output shows "Installing agent-ensemble v0.1.0 to ~/.claude/"
  And the output shows 4 progress steps
  And nWave is installed via "pipx install nwave-ai && nwave-ai install"
  And 10 command files are created in ~/.claude/commands/ensemble/
  And the Python library is created in ~/.claude/lib/python/agent_ensemble/
  And ~/.claude/ensemble-manifest.txt is created
  And the output lists all 10 available commands with descriptions
```

### Scenario 1b: Installation with nWave already present

```gherkin
Scenario: Developer installs when nWave already exists
  Given Carlos Mendez has installed agent-ensemble 0.1.0 via pipx
  And nWave v1.2.0 is already installed
  And no previous ensemble installation exists in ~/.claude/
  When Carlos runs "agent-ensemble install"
  Then the output shows "nWave v1.2.0 already installed. Skipping."
  And nWave is not reinstalled
  And the installation proceeds with ensemble components
```

### Scenario 2: Upgrade with automatic backup

```gherkin
Scenario: Developer upgrades existing installation
  Given Carlos Mendez has agent-ensemble v0.0.9 installed in ~/.claude/
  And Carlos has upgraded to agent-ensemble 0.1.0 via pipx
  And nWave is already installed
  When Carlos runs "agent-ensemble install"
  Then the output shows "nWave already installed. Skipping."
  And the output shows "Found existing installation: v0.0.9"
  And a backup directory is created at ~/.claude/ensemble-backup-{timestamp}/
  And the backup contains all previous installation files
  And the installation proceeds with updated files
  And the output shows "Updated from v0.0.9 to v0.1.0"
  And the output mentions rollback option
```

### Scenario 2b: nWave installation failure

```gherkin
Scenario: Installation fails when nWave cannot be installed
  Given Carlos Mendez has installed agent-ensemble 0.1.0 via pipx
  And nWave is not installed
  And pipx is not available on the system
  When Carlos runs "agent-ensemble install"
  Then the output shows "Error: Failed to install nWave dependency"
  And the output explains nWave is required
  And the output provides manual installation steps
  And no partial ensemble installation is created
```

### Scenario 3: Preserve unrelated files

```gherkin
Scenario: Installation preserves user's custom files
  Given Carlos Mendez has ~/.claude/commands/my-custom-command.md
  And Carlos has ~/.claude/agents/my-agent/
  When Carlos runs "agent-ensemble install"
  Then ~/.claude/commands/my-custom-command.md still exists unchanged
  And ~/.claude/agents/my-agent/ still exists unchanged
  And only ensemble-specific files are created
```

### Scenario 4: Permission denied error

```gherkin
Scenario: Installation fails with permission error
  Given Carlos Mendez has ~/.claude/ with read-only permissions
  When Carlos runs "agent-ensemble install"
  Then the output shows "Error: Cannot write to ~/.claude/"
  And the output explains the cause
  And the output provides steps to fix permissions
  And no partial installation is created
```

### Scenario 5: Idempotent reinstallation

```gherkin
Scenario: Developer can safely reinstall
  Given Carlos Mendez has completed agent-ensemble installation
  When Carlos runs "agent-ensemble install" again
  Then a backup of the current installation is created
  And the installation completes successfully
  And all files are in a healthy state
```

## Acceptance Criteria

- [ ] `agent-ensemble install` checks for nWave dependency first
- [ ] If nWave is not installed, automatically install via `pipx install nwave-ai && nwave-ai install`
- [ ] If nWave is already installed, skip and report version
- [ ] If nWave installation fails, show clear error with manual installation steps
- [ ] `agent-ensemble install` copies commands to ~/.claude/commands/ensemble/
- [ ] `agent-ensemble install` copies library to ~/.claude/lib/python/agent_ensemble/
- [ ] `agent-ensemble install` creates manifest at ~/.claude/ensemble-manifest.txt
- [ ] Installation shows progress (4 steps) with clear status
- [ ] Installation lists all available commands with descriptions
- [ ] Existing installations are backed up before upgrade
- [ ] Backup directory uses timestamp for uniqueness
- [ ] User's non-ensemble files in ~/.claude/ are preserved
- [ ] Permission errors provide actionable recovery steps
- [ ] Installation is idempotent (safe to run multiple times)

## Technical Notes (Optional)

- **nWave dependency**: agent-ensemble requires nWave for core agent functionality
  - nWave PyPI package: `nwave-ai`
  - nWave GitHub: https://github.com/nWave-ai/nWave
  - Detection: Check if `nwave-ai` command exists or `~/.claude/commands/nw/` exists
  - Installation: `pipx install nwave-ai && nwave-ai install`
- Commands source: `commands/*.md` in the package
- Library source: `src/agent_ensemble/` in the package
- Manifest format: YAML with version, timestamp, file list
- Backup naming: `ensemble-backup-{YYYYMMDD-HHMMSS}/`

## Dependencies

- US-01: PyPI Package Installation (must be installable first)

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| nWave installation fails | Medium | High | Provide clear manual installation steps |
| nWave version incompatibility | Low | Medium | Document minimum nWave version required |
| Conflicting commands from other tools | Low | Medium | Use ensemble/ namespace |
| Backup fills disk on repeated installs | Low | Low | Clean up old backups (keep last 3) |

# US-04: Version and Status Commands

## Problem

Carlos Mendez has been using agent-ensemble for a few weeks. A colleague mentions a new feature in "the latest version" and Carlos isn't sure what version he has. He also wants to verify his installation is healthy after moving his home directory. He finds it frustrating to not have quick ways to check version and installation health -- with other CLI tools, `--version` is standard and most have a `status` or `doctor` command.

## Who

| User Type | Context | Motivation |
|-----------|---------|------------|
| Developer | Checking for updates | Know if upgrade is needed |
| Developer | Troubleshooting | Verify installation is intact |
| Developer | Team coordination | Ensure same version as teammates |

## Solution

Provide `agent-ensemble --version` for quick version check and `agent-ensemble status` for detailed installation health report.

## Job Story Trace

**Traces to**: Install Job (verification step) and Update Job (determining if update needed)
> "When I'm troubleshooting an issue or want to verify my setup, I want to quickly check what version I have and whether the installation is healthy, so I can rule out installation problems and communicate my environment to others."

## Domain Examples

### Example 1: Happy Path -- Quick version check

Carlos wants to know his version:

```
$ agent-ensemble --version
agent-ensemble 0.1.0
```

Simple, fast, standard -- just like `git --version` or `python --version`.

### Example 2: Happy Path -- Detailed status

Carlos wants to verify his installation after system updates:

```
$ agent-ensemble status

agent-ensemble v0.1.0

Installation:
  Location:    ~/.claude/
  Manifest:    ~/.claude/ensemble-manifest.txt
  Installed:   2026-03-04 14:30:22

Components:
  commands/ensemble/           10 files    OK
  lib/python/agent_ensemble/   12 files    OK

Status: Healthy
```

Carlos sees everything is fine and knows exactly when he installed.

### Example 3: Edge Case -- Unhealthy installation

Carlos accidentally deleted a command file:

```
$ agent-ensemble status

agent-ensemble v0.1.0

Installation:
  Location:    ~/.claude/
  Manifest:    ~/.claude/ensemble-manifest.txt
  Installed:   2026-03-04 14:30:22

Components:
  commands/ensemble/           9 files     MISSING FILES
    Missing: review.md
  lib/python/agent_ensemble/   12 files    OK

Status: Unhealthy

To repair: agent-ensemble install
```

Carlos knows exactly what's wrong and how to fix it.

### Example 4: Error Case -- Not installed to Claude Code

Carlos installed via pipx but forgot the integration step:

```
$ agent-ensemble status

agent-ensemble v0.1.0

Installation:
  No Claude Code integration found.
  ~/.claude/ensemble-manifest.txt does not exist.

Run 'agent-ensemble install' to complete setup.
```

Carlos is guided to complete the installation.

### Example 5: Edge Case -- Extra files detected

Carlos added custom files to the ensemble directory:

```
$ agent-ensemble status

agent-ensemble v0.1.0

Installation:
  Location:    ~/.claude/
  Manifest:    ~/.claude/ensemble-manifest.txt
  Installed:   2026-03-04 14:30:22

Components:
  commands/ensemble/           11 files    OK (1 extra)
    Extra: my-custom-review.md
  lib/python/agent_ensemble/   12 files    OK

Status: Healthy

Note: Extra files in ensemble directories will be preserved during updates.
```

Carlos's customizations are acknowledged and won't cause issues.

## UAT Scenarios (BDD)

### Scenario 1: Quick version check

```gherkin
Scenario: Developer checks installed version
  Given Carlos Mendez has agent-ensemble 0.1.0 installed via pipx
  When Carlos runs "agent-ensemble --version"
  Then the output is exactly "agent-ensemble 0.1.0"
  And no additional output is shown
```

### Scenario 2: Healthy status check

```gherkin
Scenario: Developer verifies healthy installation
  Given Carlos Mendez has a complete agent-ensemble installation
  And all 10 commands exist in ~/.claude/commands/ensemble/
  And the Python library exists in ~/.claude/lib/python/agent_ensemble/
  When Carlos runs "agent-ensemble status"
  Then the output shows the version "agent-ensemble v0.1.0"
  And the output shows the installation location
  And the output shows the manifest path
  And the output shows the installation timestamp
  And the output shows commands with "OK" status
  And the output shows library with "OK" status
  And the output shows "Status: Healthy"
```

### Scenario 3: Detect missing files

```gherkin
Scenario: Developer discovers missing command file
  Given Carlos Mendez has agent-ensemble installed
  And ~/.claude/commands/ensemble/review.md has been deleted
  When Carlos runs "agent-ensemble status"
  Then the output shows commands with "MISSING FILES" status
  And the output lists "Missing: review.md"
  And the output shows "Status: Unhealthy"
  And the output suggests "agent-ensemble install" to repair
```

### Scenario 4: Not installed to Claude Code

```gherkin
Scenario: Developer checks status before integration
  Given Carlos Mendez has agent-ensemble installed via pipx
  But has not run "agent-ensemble install"
  When Carlos runs "agent-ensemble status"
  Then the output shows "No Claude Code integration found"
  And the output explains the manifest is missing
  And the output suggests running "agent-ensemble install"
```

### Scenario 5: Extra files acknowledged

```gherkin
Scenario: Developer has custom files in ensemble directory
  Given Carlos Mendez has agent-ensemble installed
  And Carlos added ~/.claude/commands/ensemble/my-custom.md
  When Carlos runs "agent-ensemble status"
  Then the output shows commands with "OK (1 extra)" status
  And the output lists the extra file
  And the output shows "Status: Healthy"
  And a note explains extra files are preserved during updates
```

### Scenario 6: Version matches across outputs

```gherkin
@property
Scenario: Version consistency
  Given Carlos Mendez has agent-ensemble 0.1.0 installed
  Then "agent-ensemble --version" shows "0.1.0"
  And "agent-ensemble status" shows "v0.1.0"
  And ~/.claude/ensemble-manifest.txt contains "version: 0.1.0"
```

## Acceptance Criteria

- [ ] `agent-ensemble --version` outputs exactly "agent-ensemble {version}"
- [ ] `agent-ensemble status` shows version, location, manifest path, timestamp
- [ ] `agent-ensemble status` shows component health (OK, MISSING FILES)
- [ ] `agent-ensemble status` shows overall status (Healthy/Unhealthy)
- [ ] Missing files are listed by name
- [ ] Extra files are acknowledged but don't cause Unhealthy status
- [ ] Not-installed scenario provides guidance
- [ ] Version is consistent across all outputs

## Technical Notes (Optional)

- Version read from package metadata (setuptools)
- Status reads manifest for expected file list
- Health check compares manifest to filesystem
- Extra files detected by comparing filesystem to manifest

## Dependencies

- US-02: Claude Code Integration (manifest provides file list)

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Version mismatch between package and manifest | Low | Medium | Read from single source (package metadata) |
| Slow status check with many files | Very Low | Low | 22 files is fast |

# US-03: Clean Uninstallation

## Problem

Maria Santos is a developer who tried agent-ensemble but decided it doesn't fit her workflow. She wants to cleanly remove it from her system without leaving orphaned files in `~/.claude/`. She finds it frustrating that many CLI tools don't provide clean uninstall -- she has to manually hunt for config files, cache directories, and leftover scripts. She wishes she could run one command and know everything is gone.

## Who

| User Type | Context | Motivation |
|-----------|---------|------------|
| Developer | Tool doesn't fit workflow | Clean removal, reclaim disk space |
| Developer | Troubleshooting | Clean slate for fresh install |
| Developer | Machine cleanup | Remove unused tools |

## Solution

Provide `agent-ensemble uninstall` command that reads the manifest file to know exactly what files were installed, shows a preview of what will be removed, asks for confirmation, and cleanly removes all ensemble-related files without touching other content in `~/.claude/`.

## Job Story Trace

**Traces to**: Uninstall Job (JTBD Analysis)
> "When I no longer need agent-ensemble (or need to reinstall cleanly), I want to completely remove all installed files, so I can have a clean system without leftover artifacts or confusion about what's installed."

## Domain Examples

### Example 1: Happy Path -- Standard uninstall

Maria decides to remove agent-ensemble:

```
$ agent-ensemble uninstall

Uninstalling agent-ensemble v0.1.0 from ~/.claude/

The following will be removed:
  ~/.claude/commands/ensemble/       (10 files)
  ~/.claude/lib/python/agent_ensemble/  (12 files)
  ~/.claude/ensemble-manifest.txt

Total: 23 files

Continue? [y/N] y

Removing files...
  [1/3] Removing commands...         done
  [2/3] Removing library...          done
  [3/3] Removing manifest...         done

agent-ensemble has been uninstalled.

To remove the CLI tool: pipx uninstall agent-ensemble
```

Maria appreciates the preview and confirmation -- she knows exactly what's being deleted.

### Example 2: Edge Case -- Abort uninstall

Maria starts the uninstall but changes her mind:

```
$ agent-ensemble uninstall

Uninstalling agent-ensemble v0.1.0 from ~/.claude/

The following will be removed:
  ~/.claude/commands/ensemble/       (10 files)
  ~/.claude/lib/python/agent_ensemble/  (12 files)
  ~/.claude/ensemble-manifest.txt

Total: 23 files

Continue? [y/N] n

Uninstall cancelled. No files were removed.
```

Maria can safely explore the uninstall without committing.

### Example 3: Edge Case -- Force uninstall without confirmation

Maria is scripting machine cleanup and needs non-interactive mode:

```
$ agent-ensemble uninstall --yes

Uninstalling agent-ensemble v0.1.0 from ~/.claude/

Removing files...
  [1/3] Removing commands...         done
  [2/3] Removing library...          done
  [3/3] Removing manifest...         done

agent-ensemble has been uninstalled.
```

### Example 4: Error Case -- No installation found

Maria tries to uninstall but agent-ensemble isn't installed:

```
$ agent-ensemble uninstall

No agent-ensemble installation found.

  The manifest file ~/.claude/ensemble-manifest.txt does not exist.
  This usually means agent-ensemble was never installed or was
  already uninstalled.

  If you have leftover files, you can manually remove:
    rm -rf ~/.claude/commands/ensemble/
    rm -rf ~/.claude/lib/python/agent_ensemble/
```

Maria gets guidance even for edge cases.

### Example 5: Error Case -- Corrupted manifest

Maria's manifest file was accidentally deleted:

```
$ agent-ensemble uninstall

Warning: Manifest file not found or corrupted.

  The file ~/.claude/ensemble-manifest.txt could not be read.
  Cannot determine exact files to remove.

  Would you like to remove known ensemble directories anyway?
    ~/.claude/commands/ensemble/
    ~/.claude/lib/python/agent_ensemble/

  This is safe if you haven't modified these directories.

Continue? [y/N] y

Removing directories...
Done. Ensemble files removed.
```

## UAT Scenarios (BDD)

### Scenario 1: Standard uninstall with confirmation

```gherkin
Scenario: Developer uninstalls agent-ensemble
  Given Maria Santos has agent-ensemble v0.1.0 installed
  And the manifest file exists at ~/.claude/ensemble-manifest.txt
  When Maria runs "agent-ensemble uninstall"
  Then the output shows a preview of files to be removed
  And the output shows the total file count
  And Maria is prompted "Continue? [y/N]"
  When Maria enters "y"
  Then all ensemble files are removed from ~/.claude/
  And the manifest file is removed
  And the output confirms uninstall completion
  And the output suggests "pipx uninstall agent-ensemble" for CLI removal
```

### Scenario 2: Abort uninstall

```gherkin
Scenario: Developer cancels uninstall
  Given Maria Santos has agent-ensemble installed
  When Maria runs "agent-ensemble uninstall"
  And Maria enters "n" at the confirmation prompt
  Then no files are removed
  And the output shows "Uninstall cancelled. No files were removed."
```

### Scenario 3: Force uninstall without confirmation

```gherkin
Scenario: Developer uses non-interactive uninstall
  Given Maria Santos has agent-ensemble installed
  When Maria runs "agent-ensemble uninstall --yes"
  Then no confirmation prompt is shown
  And all ensemble files are removed
  And the output confirms uninstall completion
```

### Scenario 4: No installation found

```gherkin
Scenario: Developer tries to uninstall when not installed
  Given Maria Santos does not have agent-ensemble installed
  And ~/.claude/ensemble-manifest.txt does not exist
  When Maria runs "agent-ensemble uninstall"
  Then the output shows "No agent-ensemble installation found"
  And the output explains why (manifest not found)
  And the output suggests manual removal commands if needed
```

### Scenario 5: Preserve non-ensemble files

```gherkin
Scenario: Uninstall preserves user's custom files
  Given Maria Santos has agent-ensemble installed
  And Maria has ~/.claude/commands/my-custom-command.md
  And Maria has ~/.claude/agents/my-agent/
  When Maria runs "agent-ensemble uninstall" and confirms
  Then ~/.claude/commands/my-custom-command.md still exists
  And ~/.claude/agents/my-agent/ still exists
  And only ensemble-specific files are removed
```

### Scenario 6: Handle corrupted manifest

```gherkin
Scenario: Uninstall handles missing manifest gracefully
  Given Maria Santos has ensemble files in ~/.claude/
  But ~/.claude/ensemble-manifest.txt is missing
  When Maria runs "agent-ensemble uninstall"
  Then the output shows a warning about missing manifest
  And the output offers to remove known ensemble directories
  And Maria can confirm to proceed with directory removal
```

## Acceptance Criteria

- [ ] `agent-ensemble uninstall` shows preview of files to remove
- [ ] `agent-ensemble uninstall` requires confirmation (default: N)
- [ ] `agent-ensemble uninstall --yes` skips confirmation
- [ ] Uninstall removes only files listed in manifest
- [ ] User's non-ensemble files in ~/.claude/ are preserved
- [ ] Missing manifest scenario provides guidance
- [ ] Uninstall suggests `pipx uninstall` for complete removal
- [ ] Progress shown during removal
- [ ] Clean exit with summary message

## Technical Notes (Optional)

- Reads file list from ~/.claude/ensemble-manifest.txt
- Deletes files in reverse order (files before directories)
- Empty parent directories are preserved
- --yes flag for CI/scripting use

## Dependencies

- US-02: Claude Code Integration (manifest must exist for clean uninstall)

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental deletion of user files | Low | High | Only delete files in manifest, preview + confirm |
| Orphaned files if manifest incomplete | Low | Low | Manifest tracks all files at install time |

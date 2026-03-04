# Shared Artifacts Registry: Packaging Feature

## Purpose

This registry tracks all data values that appear in multiple places across the packaging feature journeys. Every `${variable}` in TUI mockups must have a documented source of truth and list of consumers. Untracked artifacts are the primary cause of horizontal integration failures.

---

## Artifact Registry

### version

```yaml
version:
  source_of_truth: "pyproject.toml [project] version field"
  consumers:
    - "pipx install output ('installed package agent-ensemble 0.1.0')"
    - "agent-ensemble install output ('Installing agent-ensemble v0.1.0')"
    - "agent-ensemble --version output"
    - "agent-ensemble status output"
    - "~/.claude/ensemble-manifest.txt"
  owner: "packaging feature"
  integration_risk: "HIGH - version mismatch breaks user trust and update detection"
  validation: "All consumers must read from pyproject.toml at build/install time"
```

### install_path

```yaml
install_path:
  source_of_truth: "src/agent_ensemble/constants.py INSTALL_PATH"
  value: "~/.claude/"
  consumers:
    - "agent-ensemble install output"
    - "agent-ensemble uninstall output"
    - "agent-ensemble status output"
    - "Documentation (README.md)"
  owner: "packaging feature"
  integration_risk: "HIGH - path mismatch breaks installation completely"
  validation: "Hardcoded constant, same value must appear in docs"
```

### manifest_path

```yaml
manifest_path:
  source_of_truth: "src/agent_ensemble/constants.py MANIFEST_PATH"
  value: "~/.claude/ensemble-manifest.txt"
  consumers:
    - "agent-ensemble install (creates manifest)"
    - "agent-ensemble uninstall (reads manifest for file list)"
    - "agent-ensemble status (displays path)"
  owner: "packaging feature"
  integration_risk: "HIGH - manifest is critical for clean uninstall"
  validation: "Manifest file must exist after install, must be readable"
```

### backup_path_pattern

```yaml
backup_path_pattern:
  source_of_truth: "src/agent_ensemble/constants.py BACKUP_PATH_TEMPLATE"
  value: "~/.claude/ensemble-backup-{timestamp}/"
  consumers:
    - "agent-ensemble install (creates backup on upgrade)"
    - "agent-ensemble rollback (restores from backup)"
    - "agent-ensemble status (shows last backup if exists)"
  owner: "packaging feature"
  integration_risk: "MEDIUM - backup enables safe rollback"
  validation: "Timestamp format must be parseable, backup must be restorable"
```

### command_count

```yaml
command_count:
  source_of_truth: "len(glob('commands/*.md'))"
  value: "10 (at time of writing)"
  consumers:
    - "agent-ensemble install output ('10 commands')"
    - "agent-ensemble status output"
    - "README.md documentation"
  owner: "packaging feature"
  integration_risk: "LOW - cosmetic mismatch, but confusing"
  validation: "Count dynamically at install time, not hardcoded"
```

### commands_path

```yaml
commands_path:
  source_of_truth: "src/agent_ensemble/constants.py COMMANDS_PATH"
  value: "~/.claude/commands/ensemble/"
  consumers:
    - "agent-ensemble install (copies commands here)"
    - "agent-ensemble uninstall (removes from here)"
    - "agent-ensemble status (checks health)"
    - "Claude Code (discovers commands from here)"
  owner: "packaging feature"
  integration_risk: "HIGH - wrong path means commands not discoverable"
  validation: "Path must match Claude Code's command discovery logic"
```

### lib_path

```yaml
lib_path:
  source_of_truth: "src/agent_ensemble/constants.py LIB_PATH"
  value: "~/.claude/lib/python/agent_ensemble/"
  consumers:
    - "agent-ensemble install (copies library here)"
    - "agent-ensemble uninstall (removes from here)"
    - "agent-ensemble status (checks health)"
    - "Python runtime (imports from here)"
  owner: "packaging feature"
  integration_risk: "HIGH - wrong path means Python imports fail"
  validation: "Path must be importable by Python"
```

### install_timestamp

```yaml
install_timestamp:
  source_of_truth: "~/.claude/ensemble-manifest.txt (generated at install time)"
  value: "ISO 8601 format, e.g., 2026-03-04T14:30:22"
  consumers:
    - "agent-ensemble status output"
    - "agent-ensemble install (for backup naming)"
  owner: "packaging feature"
  integration_risk: "LOW - informational only"
  validation: "Timestamp must be human-readable in status output"
```

### nwave_dependency

```yaml
nwave_dependency:
  source_of_truth: "nWave PyPI package 'nwave-ai'"
  value: "pipx install nwave-ai && nwave-ai install"
  consumers:
    - "agent-ensemble install (dependency check step)"
    - "Documentation (README.md prerequisites)"
    - "Error messages (manual installation instructions)"
  owner: "packaging feature"
  integration_risk: "HIGH - missing nWave means agent-ensemble cannot function"
  validation: "Check nwave-ai command exists or ~/.claude/commands/nw/ directory exists"
```

### nwave_version

```yaml
nwave_version:
  source_of_truth: "nwave-ai --version output"
  value: "dynamic (e.g., 1.2.0)"
  consumers:
    - "agent-ensemble install output (when skipping)"
    - "agent-ensemble status output (dependency health)"
  owner: "nWave project (external)"
  integration_risk: "MEDIUM - version mismatch may cause compatibility issues"
  validation: "Parse version from nwave-ai --version"
```

---

## Manifest File Format

The manifest file serves as the installation record and is critical for uninstall operations.

```
# agent-ensemble manifest
# Do not edit manually

version: 0.1.0
installed: 2026-03-04T14:30:22
source: pypi

files:
  - commands/ensemble/audit.md
  - commands/ensemble/debug.md
  - commands/ensemble/deliver.md
  - commands/ensemble/design.md
  - commands/ensemble/discover.md
  - commands/ensemble/distill.md
  - commands/ensemble/document.md
  - commands/ensemble/execute.md
  - commands/ensemble/refactor.md
  - commands/ensemble/review.md
  - lib/python/agent_ensemble/__init__.py
  - lib/python/agent_ensemble/cli.py
  - lib/python/agent_ensemble/constants.py
  - lib/python/agent_ensemble/installer.py
  ... (full file list)

checksum: sha256:abc123...
```

---

## Integration Validation Rules

### Rule 1: Version Consistency

**Check**: `version` in pyproject.toml == version in --version output == version in manifest
**When**: After every install, before every release
**Failure Impact**: CRITICAL - users cannot trust version information

### Rule 2: Path Consistency

**Check**: All path constants in code match documentation
**When**: Documentation review
**Failure Impact**: HIGH - users following docs get wrong paths

### Rule 3: Manifest Completeness

**Check**: Every file installed is listed in manifest
**When**: After install completes
**Failure Impact**: HIGH - uninstall leaves orphaned files

### Rule 4: Command Discovery

**Check**: Commands in `commands_path` are discoverable by Claude Code
**When**: After install, during first use step
**Failure Impact**: CRITICAL - installed commands not usable

---

### Rule 5: nWave Dependency

**Check**: nWave is installed before ensemble components are copied
**When**: At start of `agent-ensemble install`
**Failure Impact**: CRITICAL - agent-ensemble depends on nWave for core functionality

---

## Validation Checklist

Before release, verify:

- [ ] `pyproject.toml` version matches expected release version
- [ ] README.md installation commands match actual CLI commands
- [ ] All paths in constants.py match documentation
- [ ] Manifest format is parseable by uninstall logic
- [ ] Backup directory timestamp format is consistent
- [ ] Command count in install output matches actual command files
- [ ] All 10 commands are included in package distribution
- [ ] nWave dependency detection works correctly
- [ ] nWave installation commands are correct (`pipx install nwave-ai && nwave-ai install`)

---

## Cross-References

- Journey visualization: `docs/ux/packaging/journey-install-visual.md`
- Journey schema: `docs/ux/packaging/journey-install.yaml`
- BDD scenarios: `docs/ux/packaging/journey-install.feature`
- JTBD analysis: `docs/ux/packaging/jtbd-analysis.md`

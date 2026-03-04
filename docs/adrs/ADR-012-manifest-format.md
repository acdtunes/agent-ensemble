# ADR-012: Manifest File Format

## Status

Accepted

## Context

The packaging feature requires a manifest file to track installed files for:
- Clean uninstallation (know exactly what to remove)
- Status reporting (verify installation health)
- Version tracking (detect upgrade scenarios)

The manifest must be:
- Human-readable (debugging, manual inspection)
- Machine-parseable (programmatic access)
- Able to store metadata (version, timestamp)
- Able to store file lists

### Constraints
- Minimize new dependencies
- Align with nWave ecosystem where practical
- Support comments for header/warnings

## Decision

Use **YAML** format via pyyaml.

Manifest location: `~/.claude/ensemble-manifest.yaml`

## Alternatives Considered

### Alternative 1: JSON

**What**: JavaScript Object Notation, Python stdlib support.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Dependencies | None | json module in stdlib |
| Human readable | Medium | Verbose, no comments |
| Ecosystem fit | Low | nWave uses YAML |
| Parsing | Simple | json.load/dump |

**Why Rejected**:
- No comment support; manifest should warn "Do not edit manually"
- Less readable for nested structures
- Inconsistent with nWave's YAML usage

### Alternative 2: TOML

**What**: Tom's Obvious Minimal Language, Python config standard.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Dependencies | Conditional | tomllib stdlib in 3.11+, tomli needed for write |
| Human readable | High | Clean syntax |
| Ecosystem fit | Low | nWave uses YAML |
| Parsing | Medium | tomllib read-only, need tomli-w for write |

**Why Rejected**:
- Requires tomli-w dependency for writing (stdlib tomllib is read-only)
- Inconsistent with nWave's YAML-based configurations
- File lists less natural in TOML syntax

### Alternative 3: Plain Text

**What**: Simple line-based file list.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Dependencies | None | String operations |
| Human readable | High | One file per line |
| Ecosystem fit | N/A | - |
| Parsing | Trivial | readlines() |

**Why Rejected**:
- Cannot store metadata (version, timestamp) naturally
- Would need custom format for structured data
- Harder to extend later

### Alternative 4: SQLite

**What**: Embedded database.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Dependencies | None | sqlite3 in stdlib |
| Human readable | None | Binary format |
| Ecosystem fit | Low | Over-engineered |
| Parsing | Complex | SQL queries |

**Why Rejected**:
- Not human-readable; can't inspect with text editor
- Over-engineered for simple file list
- No benefit over YAML for this use case

## Consequences

### Positive
- pyyaml already in project dependencies (pyproject.toml)
- Human-readable with comment support
- Aligned with nWave manifest/config patterns
- Easy to extend with new metadata fields
- Native support for lists and nested structures

### Negative
- YAML parsing quirks (e.g., `yes`/`no` as boolean)
- Slightly slower than JSON for large files (not relevant here)

### Neutral
- ~25 files in manifest; performance is irrelevant
- pyyaml dependency already exists; no new deps

## Manifest Schema

```yaml
# agent-ensemble manifest
# Do not edit manually - managed by agent-ensemble install/uninstall

version: "0.1.0"
installed: "2026-03-04T14:30:22"
source: pypi

files:
  commands:
    - ensemble/audit.md
    - ensemble/debug.md
    - ensemble/deliver.md
    - ensemble/design.md
    - ensemble/discover.md
    - ensemble/distill.md
    - ensemble/document.md
    - ensemble/execute.md
    - ensemble/refactor.md
    - ensemble/review.md
  lib:
    - python/agent_ensemble/__init__.py
    - python/agent_ensemble/cli/__init__.py
    - python/agent_ensemble/cli/team_state.py
    - python/agent_ensemble/cli/parallel_groups.py
    - python/agent_ensemble/cli/migrate_roadmap.py
    - python/agent_ensemble/cli/worktree.py
    # ... additional library files

checksum: sha256:abc123def456...
```

### Schema Rules

1. `version`: String, quoted to prevent YAML number parsing
2. `installed`: ISO 8601 timestamp string
3. `source`: Always "pypi" for PyPI installation
4. `files.commands`: Relative paths from ~/.claude/commands/
5. `files.lib`: Relative paths from ~/.claude/lib/
6. `checksum`: SHA256 of concatenated file contents (optional, for integrity)

## Implementation Notes

```python
# Read
with open(manifest_path) as f:
    data = yaml.safe_load(f)

# Write
with open(manifest_path, 'w') as f:
    yaml.safe_dump(data, f, default_flow_style=False, sort_keys=False)
```

Use `safe_load`/`safe_dump` to prevent arbitrary code execution.

## References

- YAML spec: https://yaml.org/spec/1.2.2/
- pyyaml: https://pyyaml.org/
- nWave manifest pattern: similar YAML-based tracking

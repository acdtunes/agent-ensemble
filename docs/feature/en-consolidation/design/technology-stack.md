# EN Consolidation -- Technology Stack

## Runtime

| Technology | Version | License | Rationale |
|---|---|---|---|
| Python | 3.11+ | PSF | Already in use. Required for CLI tools. Type hints, NamedTuple, pattern matching. |
| Bash | 5.x | GPL-3.0 | Sync script. Available on all target platforms. Simple text transforms via `sed`. |

## Python Dependencies

| Package | Version | License | Purpose | Alternatives Considered |
|---|---|---|---|---|
| ruamel.yaml | >=0.18 | MIT | YAML I/O with comment preservation. Already in use by adapters. | pyyaml (no comment preservation) |
| pyyaml | >=6.0 | MIT | YAML safe_load for simple reads. Already in use. | ruamel.yaml only (heavier for simple reads) |

## Build / Packaging

| Tool | Version | License | Rationale |
|---|---|---|---|
| setuptools | >=68.0 | MIT | Already in use. Editable install (`pip install -e .`) for `src/en/` and `src/des/`. |
| wheel | latest | MIT | Build backend. Already in use. |

## Development Dependencies

| Tool | Version | License | Purpose |
|---|---|---|---|
| pytest | >=7.0 | MIT | Test runner. Already in use. |
| pytest-cov | >=4.0 | MIT | Coverage reporting. Already in use. |

## Sync Tooling

| Tool | Purpose | Notes |
|---|---|---|
| `gh` (GitHub CLI) | Download upstream nWave content | MIT license. Used by sync script to fetch `plugins/nw/` from nWave-ai/nWave. |
| `sed` | Content transformation (nw->en) | Standard POSIX utility. Portable across macOS and Linux. |
| `diff` | Change reporting in sync script | Standard POSIX utility. |

## Install Tooling

| Tool | Purpose | Notes |
|---|---|---|
| `uv` | Preferred Python package installer for `uv pip install -e .` | Falls back to `pip` if unavailable. |
| `pip` | Fallback Python package installer | Standard Python tool. |
| `jq` | JSON merge for `~/.claude/settings.json` | Falls back to `python3 -c "import json; ..."` if unavailable. |
| `npm` | Board UI dependency install (`npm install` in `board/`) | Optional -- install.sh warns and continues if missing. |

## No New Dependencies Required

The consolidation reuses the existing technology stack entirely. No new Python packages, no new build tools, no proprietary components. The sync script uses only standard POSIX utilities plus `gh` (already installed for the developer). The install script uses `uv`/`pip` (already required for Python development) and optionally `jq` and `npm`.

## Package Layout After Consolidation

```
src/
  en/                     # Renamed from agent_ensemble/
    __init__.py
    cli/
      __init__.py
      team_state.py       # + next-steps command
      parallel_groups.py
      worktree.py
      migrate_roadmap.py
    adapters/
      __init__.py
      roadmap_adapter.py
      execlog_adapter.py
  des/                    # Copied from nwave/scripts/des/
    __init__.py
    cli/
      roadmap.py
      init_log.py
      log_phase.py
      verify_deliver_integrity.py
      ...
```

## pyproject.toml Changes

- `name`: `agent-ensemble` -> `en-framework` (or similar)
- `packages.find.where`: `["src"]` (unchanged)
- Package discovery will find both `en` and `des` under `src/`
- All CLI invocations: `PYTHONPATH=src python -m en.cli.*` and `PYTHONPATH=src python -m des.cli.*`

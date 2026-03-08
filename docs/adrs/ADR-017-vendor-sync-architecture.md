# ADR-017: Vendor Sync Architecture

## Status

Accepted

## Context

The nWave framework (commands, agents, skills, DES) is maintained upstream at github.com/nWave-ai/nWave. This project needs to use those files with modifications: `nw:` -> `en:` prefix rename, path updates, model ID fixes. The project must remain sync-able with upstream as nWave evolves.

Three concerns compete: (1) keeping upstream changes easy to incorporate, (2) applying project-specific transforms consistently, (3) protecting project overrides (e.g., deliver.md) from being overwritten.

## Decision

Use a vendor directory pattern: `nwave/` holds a pristine, byte-for-byte copy of upstream content. A sync script (`scripts/sync-nwave.sh`) reads `nwave/` and generates `commands/`, `agents/`, `skills/`, `src/des/` with content transforms and file renames. Both `nwave/` and generated output are committed to git.

Transform rules:
- Content: `/nw:` -> `/en:`, `nw-` -> `en-`, `~/.claude/skills/nw/` -> `skills/`, `$HOME/.claude/lib/python` -> `src`, `model: inherit` -> `model: claude-opus-4-6`
- File rename: `nw-*.md` -> `en-*.md` (agents only)
- Override protection: `commands/deliver.md` never overwritten

The script is idempotent and supports `--dry-run`.

## Alternatives Considered

### Alternative 1: Git subtree / submodule

- **What**: Use git subtree or submodule to embed nWave upstream
- **Expected Impact**: Automatic upstream tracking, standard git workflow
- **Why Insufficient**: Content transforms (nw->en rename) cannot be applied within subtree/submodule -- they require a pristine copy. Would need a post-checkout hook, which is fragile and non-obvious. Submodules add complexity for a single-developer project.

### Alternative 2: Direct download without vendor directory

- **What**: Sync script downloads upstream directly into `commands/`, `agents/`, etc., applying transforms inline. No `nwave/` directory.
- **Expected Impact**: Simpler file structure, fewer directories
- **Why Insufficient**: No pristine reference makes diffing upstream changes impossible. Cannot verify what changed between sync runs. Debugging transform errors requires re-downloading upstream. Losing the "what did upstream change?" visibility defeats the purpose of maintainable sync.

### Alternative 3: Fork upstream repository

- **What**: Fork nWave-ai/nWave, apply renames there, pull from fork
- **Expected Impact**: Standard fork workflow, GitHub PR-based sync
- **Why Insufficient**: Rename transforms would need to be reapplied on every upstream merge, creating perpetual merge conflicts. The fork diverges on every file in predictable ways (nw->en), making merge noise overwhelming. A deterministic script is cleaner.

## Consequences

- **Positive**: Clear sync boundary. Easy to diff upstream changes. Idempotent script eliminates manual rename errors. Override protection prevents accidental loss of project-specific files. `--dry-run` enables safe previewing.
- **Negative**: Disk space for duplicate files (nwave/ + generated). Must remember to run sync script after updating nwave/. Generated files in git increase repo size.
- **Mitigation**: Disk cost is negligible (~200 .md files). Sync reminder can be added as a git hook or documented workflow.

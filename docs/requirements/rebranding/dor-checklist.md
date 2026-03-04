# Definition of Ready Checklist — Rebranding to Agent Ensemble

## DoR Items

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | **User stories defined** | PASS | 8 user stories in `user-stories.md` |
| 2 | **Acceptance criteria testable** | PASS | All criteria in Gherkin format, verifiable via grep and build commands |
| 3 | **Dependencies identified** | PASS | No external dependencies; all changes are internal renames |
| 4 | **JTBD analysis complete** | PASS | Job story, dimensions, and four forces documented |
| 5 | **Journey mapped** | PASS | 5-step journey with emotional arc, visual + YAML + Gherkin |
| 6 | **Shared artifacts tracked** | PASS | Artifact registry with rename mapping across all surfaces |
| 7 | **Stories sized appropriately** | PASS | Each story is a focused rename of one layer (UI, npm, Python, CLI, install, state, docs, verification) |
| 8 | **No blocking questions** | PASS | Name decided ("Agent Ensemble"), scope clear, no concerns |

## Readiness Assessment

**READY FOR DESIGN** — All 8 DoR items pass. The rebranding scope is well-defined with clear rename mappings and testable acceptance criteria.

## Handoff Notes for DESIGN Wave

- The rebranding is primarily a **mechanical rename** across well-identified touchpoints
- No architectural changes needed — structure stays the same, only names change
- The rename mapping in `shared-artifacts-registry.md` provides the complete transformation table
- Consider whether the git repository itself should be renamed (out of scope for this feature, but worth noting)
- Consider migration: should `install.sh` clean up old `~/.claude/commands/nw-teams/` paths?

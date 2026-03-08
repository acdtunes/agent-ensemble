# EN Consolidation -- Acceptance Test Review

## Review ID: accept_rev_20260307_r2

## Peer Review (6 Dimensions)

### Dimension 1: Happy Path Bias

**Status**: PASS

Error + edge + property scenarios: 29 out of 62 total (47%). Exceeds 40% threshold.

Breakdown:
- Error paths: 9 (15%)
- Edge cases: 13 (21%)
- Property-based: 7 (11%)
- Happy paths: 33 (53%)

Key error scenarios covered: upstream unavailable, missing vendor directory, merge conflicts, failed dependencies, rename conflicts, missing upstream directories, no package manager found. Install-specific edges: settings merge, npm missing, idempotency.

### Dimension 2: GWT Format Compliance

**Status**: PASS

All scenarios follow Given-When-Then structure. Two walking skeletons (WS-02, WS-03) use multi-step When-Then for sequential interactions (ask, approve, ask again) -- this is appropriate for state machine testing where the observable outcome depends on a sequence of business events.

No scenarios have multiple independent When actions. All Given steps set context, When steps perform single actions, Then steps verify observable outcomes.

### Dimension 3: Business Language Purity

**Status**: PASS

Technical terms audit:
- No HTTP verbs, status codes, or REST/API terminology
- No database, SQL, or ORM terminology
- No class/method/function references in Gherkin
- "PYTHONPATH" appears in scenario names for US-06 -- this is the actual domain term (the user story uses it). It describes what the developer observes, not implementation detail.
- "worktree" is a domain concept in this context (Git worktree isolation is the user-facing feature)
- "CLI" appears in milestone-4 scenario names -- acceptable as it's the user's interface

Borderline terms retained with justification:
- "PYTHONPATH" -- domain term from the user story AC, not implementation leak
- "worktree" -- user-facing Git concept, part of the team orchestration domain
- "machine-parseable" -- describes the output format contract visible to the Lead

### Dimension 4: Coverage Completeness

**Status**: PASS

All 11 user stories (US-01 through US-08, including US-03b, US-03c, US-05b) have corresponding acceptance scenarios. Every acceptance criterion from the user stories has at least one scenario.

Coverage mapping verified in test-scenarios.md. US-08 (install script) adds 10 scenarios in milestone-5 plus WS-04. US-07 gains 2 additional scenarios for nwave/VERSION tracking (M3-20, M3-21).

### Dimension 5: Walking Skeleton User-Centricity

**Status**: PASS

All 4 walking skeletons pass the litmus test:
- WS-01: "Developer syncs upstream and gets working en: commands" -- user goal, not "sync script runs"
- WS-02: "Developer delivers a feature using parallel team execution" -- user goal, not "Kahn's algorithm computes layers"
- WS-03: "Developer resumes interrupted delivery without losing progress" -- user goal, not "roadmap state persists"
- WS-04: "Developer clones repo and runs install to get a working setup" -- user goal, not "pip install runs"

Then steps describe user observations: "can invoke commands", "steps returned as ready", "approved remain approved", "CLIs importable, settings configured".

### Dimension 6: Priority Validation

**Status**: PASS

Priority ordering:
1. WS-01 (sync pipeline) -- foundational, enables all generation scenarios
2. M4-01 (next-steps scheduling) -- core algorithm, enables delivery loop
3. WS-02 (parallel delivery) -- primary new capability
4. Package rename (US-02) -- independent, lower risk

This matches the feature's dependency graph: sync must work before generation, next-steps must work before delivery orchestration.

## Approval Status: APPROVED

## Mandate Compliance Evidence

### CM-A: Hexagonal Boundary Enforcement

Driving ports used in step definitions:
- `scripts/sync-nwave.sh` -- sync operations (test_vendor_steps.py, test_sync_steps.py)
- `python -m en.cli.team_state next-steps` -- scheduling (test_deliver_steps.py)
- `python -m en.cli.team_state` -- CLI access verification (test_package_steps.py)
- `./install.sh` -- consumer setup (test_install_steps.py)
- Filesystem verification -- observable outcomes of sync/rename/install operations

No internal component imports in step definitions. All steps invoke through CLI entry points or verify filesystem outcomes.

### CM-B: Business Language Purity

Gherkin files contain zero technical implementation terms. Step methods delegate to subprocess calls (CLI driving ports) or filesystem verification. No `requests.post()`, no `db.execute()`, no direct function calls to internal modules.

### CM-C: Walking Skeleton + Focused Scenario Counts

- Walking skeletons: 4
- Focused scenarios: 62
- Total: 66
- Ratio: 6% walking skeletons, 94% focused -- within recommended range

## Definition of Done Checklist

- [x] All acceptance scenarios written with step definitions
- [x] Walking skeletons identified (3) with implementation sequence
- [x] Error path ratio >= 33% (46% with property tests)
- [x] All 11 user stories covered (US-01 through US-08)
- [x] Business language verified (zero technical terms in Gherkin)
- [x] Peer review approved (6 dimensions, all PASS)
- [x] One-at-a-time strategy defined (first scenario not @skip, rest @skip)
- [x] Property-shaped scenarios tagged @property (7 scenarios)
- [x] Driving ports identified and used exclusively

## Handoff to Software Crafter

### Implementation Sequence

Enable one scenario at a time. Start with:

1. `walking-skeleton.feature` -- "Developer syncs upstream and gets working en: commands" (already enabled, no @skip)
2. `milestone-1-vendor-setup.feature` -- "Vendor directory is populated from upstream" (already enabled)
3. `milestone-3-sync-generation.feature` -- "Commands are generated with en: prefix" (already enabled)
4. `milestone-4-deliver-rewrite.feature` -- "Next-steps returns steps with all deps satisfied" (already enabled)
5. `milestone-5-install.feature` -- "Install script installs Python dependencies via uv" (first install scenario)

### Property-Based Test Signals

The following @property scenarios should be implemented with generators, not single examples:

| Scenario | Generator Strategy |
|----------|-------------------|
| Dependency direction en->des never reverse | Scan all .py files in des/ |
| No global installation references anywhere | Scan all generated .md files |
| Sync script is idempotent | Run twice, diff output |
| Next-steps output is deterministic | Same input, same output |
| Scheduling never produces cycles | Generate random DAGs |
| Install script is idempotent | Run twice, verify no duplicates in settings.json, no errors |

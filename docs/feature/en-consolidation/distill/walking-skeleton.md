# EN Consolidation -- Walking Skeleton Strategy

## Walking Skeletons (3)

### WS-01: Developer syncs upstream and gets working en: commands

**User goal**: Developer populates vendor directory and gets a working set of en: commands.

**Covers**: US-01 (vendor setup), US-03 (command generation), US-07 (sync script)

**Observable outcomes**:
- Developer can invoke en: commands from the project
- Commands reference en- agents, not nw- agents
- No references to global nWave installation remain

**Implementation sequence**: This is the first skeleton to enable. It exercises the sync script end-to-end and proves the core sync pipeline works.

### WS-02: Developer delivers a feature using parallel team execution

**User goal**: Developer uses deterministic scheduling to execute roadmap steps in parallel.

**Covers**: US-05 (deliver rewrite), US-05b (next-steps CLI)

**Observable outcomes**:
- Independent steps are returned as ready simultaneously
- Dependent steps are blocked until dependencies are approved
- Newly unblocked steps appear after dependency completion

**Implementation sequence**: Enable after WS-01. Exercises the next-steps CLI through the team_state driving port.

### WS-03: Developer resumes interrupted delivery without losing progress

**User goal**: Developer can resume an interrupted delivery without losing approved work.

**Covers**: US-05 (deliver rewrite)

**Observable outcomes**:
- Approved steps remain approved after restart
- Pending steps are available for scheduling
- No approved work is reverted

**Implementation sequence**: Enable after WS-02. Verifies the resumability property of the delivery loop.

### WS-04: Developer clones repo and runs install to get a working setup

**User goal**: Developer clones the EN framework repo and has a fully working setup after running install.sh.

**Covers**: US-08 (install script update)

**Observable outcomes**:
- Python dependencies are installed (en.cli.* and des.cli.* are importable)
- Claude Code agent teams setting is configured
- Board UI is installed
- Old global installations are cleaned up if present

**Implementation sequence**: Enable after WS-01. Independent of WS-02/WS-03. Exercises the consumer onboarding path end-to-end.

## One-at-a-Time Implementation Sequence

1. **WS-01** -- Sync pipeline (enables all milestone-3 scenarios)
2. **M1-01** -- Vendor population (foundation for sync)
3. **M4-01** -- Next-steps basic scheduling (core algorithm)
4. **WS-02** -- Parallel delivery (integration of next-steps)
5. Remaining milestone-4 scenarios (scheduling edge cases)
6. **M2-01** -- Package rename (independent of sync)
7. Remaining milestone-2 scenarios
8. Remaining milestone-1 scenarios
9. Remaining milestone-3 scenarios (including M3-20, M3-21 for nwave/VERSION)
10. **WS-04** -- Consumer setup (install.sh end-to-end)
11. Remaining milestone-5 scenarios (install edge cases)
12. **WS-03** -- Resumability (requires all delivery infrastructure)

## Litmus Test Results

Each walking skeleton passes the 4-point litmus test:

| Criterion | WS-01 | WS-02 | WS-03 | WS-04 |
|-----------|-------|-------|-------|-------|
| Title describes user goal | "Developer syncs upstream and gets working commands" | "Developer delivers using parallel execution" | "Developer resumes without losing progress" | "Developer clones and installs to get working setup" |
| Given/When describe user actions | "runs the sync script" | "asks which steps are ready" | "runs deliver for the same feature" | "runs install.sh" |
| Then describe user observations | "can invoke commands", "no global refs" | "steps returned as ready", "not returned" | "approved remain", "pending available" | "CLIs importable", "settings configured", "board installed" |
| Non-technical stakeholder confirms | "Can I sync and use commands?" -- Yes | "Do independent steps run in parallel?" -- Yes | "Does it resume safely?" -- Yes | "Can I set up with one command?" -- Yes |

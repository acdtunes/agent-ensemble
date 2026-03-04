# Competing Hypotheses Debugging with Agent Teams

**Command**: `/ensemble:debug`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel debugging using Claude Code Agent Teams. You (the Lead) will create a team of troubleshooter teammates, each investigating a different hypothesis. Teammates actively challenge each other's findings, converging on the most evidence-supported root cause.

## Why Competing Hypotheses?

A single investigator tends to:
- Find one plausible explanation and stop looking
- Anchor on the first theory explored
- Miss alternative root causes

With multiple investigators actively trying to **disprove each other**, the theory that survives is more likely to be correct.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the investigation, facilitate debate, synthesize conclusion.

## Workflow

### Phase 1: Understand the Problem

Gather from user:
1. **Symptoms**: What's happening? Error messages, unexpected behavior
2. **Context**: When did it start? What changed recently?
3. **Reproduction**: Steps to reproduce (if known)

### Phase 2: Generate Hypotheses

Based on symptoms, propose 3-5 plausible hypotheses. Ask user to confirm or add more.

Example:
```
Based on the symptoms, here are candidate hypotheses:

1. Database connection pool exhaustion (timeout errors suggest resource limits)
2. Memory leak in request handler (gradual degradation pattern)
3. Race condition in concurrent writes (intermittent failures)
4. External service timeout (dependency on third-party API)
5. Configuration change (deployed recently)

Which hypotheses should we investigate? (Enter numbers, or add your own)
```

### Phase 3: Create Team

```
Create an agent team for competing hypothesis debugging.
Teammates should actively challenge each other's findings.
```

### Phase 4: Spawn Troubleshooter Teammates

Spawn one troubleshooter per hypothesis:

**Troubleshooter N Template**:
```
Spawn a troubleshooter teammate with this prompt:

"You are Troubleshooter {N}, investigating Hypothesis {N}: {hypothesis_description}

Your mission:
1. Gather evidence FOR this hypothesis
2. Gather evidence AGAINST this hypothesis
3. Apply Toyota 5 Whys methodology
4. Challenge other teammates' findings

Investigation approach:
- Search logs for relevant patterns
- Check metrics and monitoring
- Review recent code changes
- Examine configuration

Communication protocol:
- When you find supporting evidence: share with all teammates
- When you find contradicting evidence: challenge the relevant teammate
- When another teammate challenges you: defend with evidence or concede

Message me when you have a conclusion:
- CONFIRMED: {evidence that proves this hypothesis}
- DISPROVEN: {evidence that rules out this hypothesis}
- INCONCLUSIVE: {what's missing to decide}

Be adversarial — your job is not just to investigate YOUR hypothesis,
but to actively challenge the others."
```

### Phase 5: Facilitate Debate

As teammates investigate:

1. **Monitor messages**: Teammates message each other to share/challenge findings
2. **Broadcast key findings**: If one teammate finds something critical, broadcast to all
3. **Resolve deadlocks**: If two teammates are stuck arguing without evidence, intervene
4. **Track evidence**: Keep running tally of evidence for/against each hypothesis

### Phase 6: Synthesize Conclusion

Once teammates converge or exhaust investigation:

1. **Collect final positions** from each teammate
2. **Weigh evidence**:
   - How many hypotheses were DISPROVEN? (Elimination strengthens remaining)
   - Which hypothesis has strongest supporting evidence?
   - Are there multiple contributing root causes?

3. **Produce conclusion**:

```markdown
# Root Cause Analysis Report

## Conclusion
**Most Likely Root Cause**: {winning hypothesis}
**Confidence**: High/Medium/Low
**Contributing Factors**: {any secondary causes}

## Evidence Summary

### Hypothesis 1: {description}
- Status: DISPROVEN
- Evidence against: {findings}

### Hypothesis 2: {description}
- Status: CONFIRMED (Primary)
- Evidence for: {findings}
- 5 Whys analysis: {chain}

### Hypothesis 3: {description}
- Status: INCONCLUSIVE
- Missing: {what would be needed}

## Recommended Fix
{actionable fix based on confirmed root cause}

## Prevention
{how to prevent recurrence}

---
Investigated by: {N} Troubleshooter teammates
Method: Competing hypotheses with adversarial debate
```

### Phase 7: Cleanup

```
Ask all troubleshooter teammates to shut down.
Clean up the team.
```

Present the RCA report to the user.

## Inter-Teammate Communication Examples

**Sharing evidence**:
```
Troubleshooter 2 → All: "Found memory growth in heap dumps correlating with error timeline.
This supports Hypothesis 2 (memory leak). Troubleshooter 1, does this affect your DB connection theory?"
```

**Challenging**:
```
Troubleshooter 3 → Troubleshooter 1: "Your DB connection hypothesis doesn't explain
why the error only happens during high load. My race condition hypothesis does.
Can you address this?"
```

**Conceding**:
```
Troubleshooter 1 → All: "Troubleshooter 3's point is valid. I cannot explain the load correlation.
Marking Hypothesis 1 as DISPROVEN based on this evidence gap."
```

## Example Invocation

```
User: /ensemble:debug "App crashes after one message instead of staying connected"

Lead (you):
1. Generate hypotheses: WebSocket timeout, connection cleanup bug, state management error
2. Create team with 3 troubleshooters
3. Facilitate debate as they investigate
4. Troubleshooter 2 proves it's a connection cleanup bug
5. Clean up team
6. Present RCA: "Root cause confirmed: onDisconnect handler closes connection prematurely"
```

## Success Criteria

- [ ] Multiple hypotheses investigated in parallel
- [ ] Teammates actively challenged each other
- [ ] At least one hypothesis confirmed OR all disproven (need new hypotheses)
- [ ] Evidence trail documented
- [ ] Actionable fix recommended
- [ ] Team cleaned up

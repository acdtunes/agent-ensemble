# Parallel Research with Agent Teams

**Command**: `/ensemble:discover`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel research using Claude Code Agent Teams. You (the Lead) will create a team of researcher teammates, each investigating a different question simultaneously. Researchers cross-reference findings, resolve contradictions, and converge on a synthesized report.

## Why Parallel Research?

A single researcher tends to:
- Explore sequentially, missing time-sensitive cross-references
- Anchor on the first source found for a topic
- Lose context when switching between unrelated domains

With multiple researchers working simultaneously, each deeply focused on one question, findings are richer, cross-referencing is explicit, and contradictions surface naturally.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the research team, facilitate cross-referencing, synthesize the final report.

**Your responsibilities**:
- Gather research goals and constraints from the user
- Generate research questions covering different angles
- Create the team and spawn researchers
- Monitor for contradictions across findings
- Synthesize all findings into a unified report
- Clean up the team

**You do NOT**:
- Conduct research yourself (researchers do this)
- Make judgment calls on contradictions without evidence

## Workflow

### Phase 1: Understand Scope

Gather from user:
1. **Research Goals**: What are we trying to learn? What decisions does this inform?
2. **Domain**: Technology, market, patterns, or codebase area
3. **Constraints**: Time scope, source preferences, depth vs breadth

### Phase 2: Generate Research Questions

Propose 3-5 research questions covering different angles:
- **Technology**: How does X work? What are the trade-offs?
- **Market/Ecosystem**: Who else solves this? What patterns exist?
- **Patterns**: What are established best practices?
- **Risks**: What can go wrong? What are the failure modes?
- **Validation**: Is there evidence that X actually works in practice?

Ask user to confirm, modify, or add questions.

Optionally, if research involves user-facing product validation, propose spawning `nw-product-discoverer` agents alongside researchers.

### Phase 3: Create Team

```
Create an agent team for parallel research.
```

### Phase 4: Spawn Researchers

**IMPORTANT — Agent Types and Model**:
- Researchers MUST use `subagent_type: nw-researcher`
- Product discovery agents MUST use `subagent_type: nw-product-discoverer`
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve
- NEVER use `general-purpose` for researchers

**Naming Convention**: `researcher-{N}` (e.g., `researcher-1`, `researcher-2`)

**MAXIMIZE PARALLELISM**: Spawn ALL researchers simultaneously in a SINGLE message with multiple Task tool calls.

**Researcher N Template**:
```
Spawn a researcher teammate (subagent_type: nw-researcher, name: researcher-{N}, model: opus) with this prompt:

"You are researcher-{N} on the {team} team. Project root: {project_root}

Research Question {N}: {question}

Your mission:
1. Investigate this question thoroughly using web search, file reading, and code analysis
2. Gather evidence from multiple sources — cross-reference for reliability
3. Document findings with citations (URLs, file paths, specific evidence)
4. Note any findings relevant to OTHER researchers' questions

Communication protocol:
- When you find something relevant to another researcher's question: message them directly
- When you discover a contradiction with another researcher's findings: message them AND me
- When you're done: message me with your complete findings

Output format:
## Question: {question}
### Key Findings
- Finding 1 (source: ...)
- Finding 2 (source: ...)
### Cross-References
- Relevant to researcher-{M}'s question: {what and why}
### Knowledge Gaps
- What we still don't know: ...
### Confidence Level
- High/Medium/Low with justification

You are using nw-researcher methodology."
```

### Phase 5: Monitor and Cross-Reference

While researchers are working:

1. **Monitor cross-findings**: When a researcher messages another with relevant findings, ensure it's received
2. **Detect contradictions**: If two researchers report conflicting evidence, broadcast the contradiction and ask both to address it
3. **Track coverage**: Ensure all questions are being adequately investigated

### Phase 6: Synthesize Report

Once all researchers complete:

1. **Collect all findings** from researcher messages
2. **Deduplicate**: Same finding from multiple researchers → merge with multiple citations
3. **Resolve contradictions**: Note which evidence is stronger, or flag for user decision
4. **Identify patterns**: Cross-cutting themes across multiple questions
5. **Produce unified report**:

```markdown
# Research Report: {topic}

## Executive Summary
{2-3 sentence synthesis of key findings}

## Research Questions & Findings

### Q1: {question}
{synthesized findings with citations}

### Q2: {question}
{synthesized findings with citations}

...

## Cross-Cutting Themes
{patterns that emerged across multiple questions}

## Contradictions & Open Questions
{unresolved conflicts, knowledge gaps}

## Recommendations
{actionable next steps based on findings}

---
Researched by: {N} researcher teammates
Method: Parallel investigation with cross-referencing
```

### Phase 7: Cleanup

```
Ask all researcher teammates to shut down.
Clean up the team.
```

Present the unified report to the user.

## Example Invocation

```
User: /ensemble:discover "Should we use event sourcing for our order management system?"

Lead (you):
1. Generate questions:
   - Q1: What are event sourcing trade-offs for order management?
   - Q2: What ORMs/frameworks support event sourcing in our stack?
   - Q3: How do companies at our scale handle order state management?
   - Q4: What are the migration risks from our current CRUD model?
2. Create team with 4 researchers
3. Researchers investigate in parallel, cross-reference findings
4. Researcher-2 finds framework limitation → messages researcher-1
5. Synthesize: "Event sourcing viable but migration risk is high. Recommend hybrid approach."
6. Clean up team, present report
```

## Success Criteria

- [ ] All research questions investigated in parallel
- [ ] Cross-references shared between researchers
- [ ] Contradictions identified and addressed
- [ ] Unified report with citations produced
- [ ] Knowledge gaps documented
- [ ] Team cleaned up

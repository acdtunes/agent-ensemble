---
description: "Creates evidence-based documentation following DIVIO/Diataxis principles. Use when writing tutorials, how-to guides, reference docs, or explanations."
argument-hint: "[topic/component] - Optional: --type=[tutorial|howto|reference|explanation] --research-depth=[overview|detailed|comprehensive|deep-dive]"
---

# EN-DOCUMENT: DIVIO Documentation Creation

**Wave**: CROSS_WAVE | **Agent**: Orchestrator (self)
**Agents**: Nova (en-researcher)|Scholar (en-researcher-reviewer)|Quill (en-documentarist)|en-documentarist-reviewer

## Overview

Create evidence-based, DIVIO-compliant documentation by orchestrating research and writing phases with peer review at each gate. Cross-wave capability for any nWave phase.

## Context Files Required

- .en/trusted-source-domains.yaml — Embed inline in researcher prompt
- agents/en-researcher.md — Extract research methodology
- agents/en-documentarist.md — Extract DIVIO framework and templates

## Command Syntax

```bash
/en:document [topic] [--type=tutorial|howto|reference|explanation] [--research-depth=overview|detailed|comprehensive|deep-dive]
```

If `--type` omitted, ask user. If `--research-depth` omitted, auto-select: tutorial->overview|howto->detailed|reference->comprehensive|explanation->deep-dive.

## Orchestration Phases

Sub-agents have no Skill tool access. Embed all domain knowledge inline in each Task prompt. Read from agent files and config at orchestration time.

```
Phase 1: Research           @en-researcher
Phase 1.5: Research Review  @en-researcher-reviewer
Phase 2: Documentation      @en-documentarist
Phase 2.5: Doc Review       @en-documentarist-reviewer
Phase 3: Handoff
```

### Phase 0: Pre-Flight

1. Validate topic non-empty, type/depth valid if provided
2. If type not specified, present DIVIO selection: TUTORIAL ("Teach me")|HOW-TO ("Help me do X")|REFERENCE ("What is X?")|EXPLANATION ("Why is X?")
3. Determine output: `docs/{tutorials|howto|reference|explanation}/{topic-kebab-case}.md`
4. Read and cache: .en/trusted-source-domains.yaml|en-researcher.md|en-documentarist.md

### Phase 1: Research (@en-researcher)

Invoke via Task tool. Prompt includes: topic|doc type|research depth|complete .en/trusted-source-domains.yaml (inline)|type-specific research focus (from en-researcher.md)|quality gates: trusted sources only, 3+ sources/claim, citation coverage >95%, source reputation >=0.80. Output: `docs/research/{topic-kebab-case}-for-{type}-doc.md`

### Phase 1.5: Research Review (@en-researcher-reviewer)

Prompt includes: research artifact path|review focus (source verification|bias detection|evidence quality|cross-reference|doc readiness)|quality gates (same as Phase 1)|output: append YAML review metadata. Verdicts: APPROVED|NEEDS_REVISION|REJECTED

### Phase 2: Documentation (@en-documentarist)

Prompt includes: topic|type|research path|DIVIO framework principles (from en-documentarist.md)|type-specific validation rules + template|collapse detection anti-patterns|quality gates: type purity >=80%, Flesch 70-80, zero spelling errors, zero broken links, style >=95%. Output: doc file + .validation.yaml

### Phase 2.5: Documentation Review (@en-documentarist-reviewer)

Prompt includes: doc artifact path|review focus (classification accuracy|validation completeness|collapse detection|recommendation quality|scores|verdict)|quality gates (same as Phase 2)|output: append YAML review metadata. Verdicts: APPROVED|NEEDS_REVISION|RESTRUCTURE_REQUIRED

### Phase 3: Handoff

Verify all deliverables exist and both reviews APPROVED. Present: research path|doc path|validation path|quality gate results|review outcomes and iteration count.

## Review Iteration Protocol

Applies to both review gates (Phase 1.5 and 2.5):
1. **APPROVED**: Proceed to next phase
2. **NEEDS_REVISION**: Extract critiques, re-invoke producer with feedback, re-invoke reviewer. Max 2 cycles. Escalate to user after 2 failures.
3. **REJECTED / RESTRUCTURE_REQUIRED**: Escalate immediately — restart|adjust scope|accept with issues|cancel.

## Examples

### Example 1: Tutorial with auto-depth
```bash
/en:document "Getting Started with nWave" --type=tutorial
```
Orchestrator auto-selects overview depth, invokes researcher, reviews, invokes documentarist, reviews, outputs to `docs/tutorials/getting-started-with-nwave.md`.

### Example 2: Explanation with explicit depth
```bash
/en:document "Why nWave Uses Hexagonal Architecture" --type=explanation --research-depth=deep-dive
```
Full 4-phase pipeline with deep-dive research. Output to `docs/explanation/`.

### Example 3: Interactive type selection
```bash
/en:document "Mikado Method Integration"
```
Orchestrator prompts user to select DIVIO type before proceeding.

## Success Criteria

- [ ] Research created with trusted sources and cross-references
- [ ] Research review: APPROVED (max 2 cycles)
- [ ] Documentation follows DIVIO template with >=80% type purity
- [ ] Doc review: APPROVED (max 2 cycles)
- [ ] All deliverables exist: research|documentation|validation report
- [ ] No collapse anti-patterns detected

## Error Handling

- Insufficient sources: continue with gaps|expand scope|cancel
- Review iteration limit exceeded: escalate with persistent issues
- Collapse detected: split into separate docs|revise scope|accept

## Next Wave

**Handoff To**: Invoking workflow
**Deliverables**:
- Research: `docs/research/{topic}-for-{type}-doc.md`
- Documentation: `docs/{type-dir}/{topic-kebab-case}.md`
- Validation: `docs/{type-dir}/{topic-kebab-case}.md.validation.yaml`

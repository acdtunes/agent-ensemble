# Rebranding Journey — Visual Map

## Journey: Developer Encounters Agent Ensemble

**Persona**: Developer discovering or using the tool
**Job**: Instantly understand what the tool does from its name and surfaces

```
 TOUCHPOINT         CURRENT                  REBRANDED                EMOTIONAL ARC
 ─────────────────────────────────────────────────────────────────────────────────

 1. Discovery       "NW Teams"               "Agent Ensemble"         Curiosity ▲
    (hear name)     "What is that?"           "AI agents working       "That sounds
                                               together — got it"      purposeful"

 2. CLI Install     ~/.claude/commands/       ~/.claude/commands/      Confidence ▲
    (install.sh)    nw-teams/                 agent-ensemble/          "Clean setup"

 3. First Command   /nw-teams:execute         /agent-ensemble:execute  Recognition ▲
    (invoke CLI)    "Why nw?"                 "Agent ensemble —        "Name matches
                                               executing together"     what it does"

 4. Open Board      "NW Teams Board"          "Agent Ensemble"         Trust ▲▲
    (web UI)        Generic dashboard feel    Purpose-built feel       "Professional
                                                                       tool"

 5. Share/Demo      "It's called NW Teams"    "It's Agent Ensemble"    Pride ▲▲▲
    (tell others)   Needs explanation          Self-explanatory         "Name sells
                                                                       itself"
```

## Key Insight

The emotional arc builds from **curiosity** to **pride** — each touchpoint reinforces the name's meaning. The current name requires explanation at every touchpoint; the new name is self-reinforcing.

## Shared Artifacts Across Touchpoints

| Artifact | Source | Used At |
|----------|--------|---------|
| Package name `agent-ensemble` | pyproject.toml, package.json | Install, CLI, Board |
| Module name `agent_ensemble` | Python source | CLI commands |
| Display name "Agent Ensemble" | UI components, HTML title | Board, Browser tab |
| Command prefix `agent-ensemble:` | Command .md files | CLI invocation |

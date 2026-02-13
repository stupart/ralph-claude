# Brain Dump: Layer Cake Meta-Test

## What We're Testing
Using the Layer Cake methodology to improve itself. This is a meta-test to:
1. Validate the 3-agent system (Planner, Builder, Judge) works
2. Find gaps or improvements in the methodology
3. Create better visualizations/documentation
4. Identify orchestration patterns

## Current State
- We have 3 subagents defined in `.claude/agents/`:
  - `layer-cake-planner.md` - Decomposes requirements
  - `layer-cake-builder.md` - Implements specs
  - `layer-cake-judge.md` - GAN critic/reviewer
- We have a service blueprint HTML (`docs/v3-system-blueprint.html`)
- We have detailed markdown specs in `docs/v3-methodology/`
- The system is designed but not yet implemented in code

## What We Want to Improve

### Visualization & Documentation
- The service blueprint is good but could be more interactive
- Need state machine diagram showing all transitions
- Need sequence diagrams for common flows
- Better prompt templates that are copy-pasteable

### Orchestration
- How does Ralph actually spawn these agents?
- What's the handoff protocol between agents?
- How do we track state across agent invocations?
- What context gets passed to each agent?

### The GAN Loop
- How aggressive should the Judge be?
- What triggers escalation vs retry?
- How do we prevent infinite loops?
- Should there be a "mercy rule" after N failures?

### Practical Concerns
- Cost management - reviews add API calls
- Context limits - how much can each agent hold?
- Session handoff - what if Claude crashes mid-layer?
- Human oversight - when do we pause for approval?

## Success Criteria for This Meta-Test
1. We successfully run through all layers using the agents
2. We identify at least 5 concrete improvements to the methodology
3. We produce updated documentation/visualizations
4. We have a working orchestration pattern we can reuse

## Anti-Goals
- Don't over-engineer this - keep it practical
- Don't add complexity for complexity's sake
- Don't get stuck in analysis paralysis

## Questions to Answer
- Is 12 layers too many? Should some be combined?
- Are the enforced minimums (3+ epics, etc.) the right numbers?
- Is the human gate at L3 and L7 optimal?
- Should the Builder ever talk directly to the Judge?

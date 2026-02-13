# Feature: Agent Handoff Protocol

## Overview
Define the complete protocol for transferring context and state between agents during layer transitions. This includes what context to preserve, how to package it, and how the receiving agent unpacks and uses it. Handoffs occur at multiple points: Planner to Judge (plan review), Judge to Planner (iteration), Planner to Builder (L7->L8), Builder to Judge (L8->L9), etc.

## User Value
Seamless handoffs prevent information loss between agents. Users don't have to re-explain context, and work doesn't regress because one agent didn't know what another agent learned. The system operates as a coherent whole despite using separate agent instances.

## Requirements
1. Define handoff data structure containing: current layer, iteration count, project context, recent artifacts, feedback history
2. Handoff from Planner to Judge must include: spec being reviewed, requirements it should meet, iteration count
3. Handoff from Judge to Planner (iteration) must include: specific feedback, issue list, severity classifications
4. Handoff from Planner to Builder must include: task spec, file paths, acceptance criteria
5. Handoff from Builder to Judge must include: task spec, implementation diff, test results
6. Handoff must include _status.md update to persist state to filesystem
7. Context package must be serializable (no live objects or function references)
8. Handoff must specify which agent type to spawn next
9. Include mechanism for preserving key decisions/rationale across handoffs
10. Handoff must handle partial completion (mid-task handoff for session resume)

## Technical Approach
1. Define TypeScript/JSON schema for handoff data structure
2. Create handoff serialization functions for each transition type
3. Store handoff context in _status.md or dedicated handoff file
4. Create handoff deserialization that initializes receiving agent
5. Include validation that handoff contains all required fields
6. Document each handoff point in the Layer Cake flow

## Acceptance Criteria
- [ ] Handoff data structure schema is defined and documented
- [ ] Each transition type (Planner->Judge, Judge->Planner, etc.) has defined handoff contents
- [ ] Handoff context persists to filesystem (_status.md or similar)
- [ ] Receiving agent can reconstruct necessary context from handoff
- [ ] No critical information is lost during handoff
- [ ] Handoff includes iteration count for graduated rigor
- [ ] Session resume can reconstruct state from persisted handoff

## Planned Tasks
1. Define handoff data structure schema
2. Map all transition points and their specific handoff requirements
3. Implement Planner <-> Judge handoff (plan review cycle)
4. Implement Planner -> Builder handoff (start build)
5. Implement Builder <-> Judge handoff (build review cycle)
6. Test full handoff chain through layer progression

## Edge Cases
- **Mid-task interruption**: Agent crashes mid-task - handoff must include partial progress
- **Multiple reviews**: Same artifact reviewed multiple times - preserve full review history
- **Context size limits**: Handoff context too large for context window - implement summarization
- **Handoff corruption**: Persisted handoff file corrupted - detect and request human recovery
- **Agent type mismatch**: Wrong agent spawned for handoff - validate agent type matches expected

## Dependencies
- Epic 2 Feature 01 (Planner Agent) - need Planner to be defined for handoff testing
- Epic 2 Feature 02 (Builder Agent) - need Builder to be defined for handoff testing
- Epic 2 Feature 03 (Judge Agent) - need Judge to be defined for handoff testing

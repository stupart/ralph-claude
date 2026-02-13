# Feature: Agent Spawning System

## Overview
Implement the mechanism for Ralph to spawn Claude agents with the correct role-specific prompts, context packages, and tool permissions. Ralph determines which agent type to spawn based on current layer, assembles the context, and initiates the agent session.

## User Value
Proper agent spawning ensures the right expertise is applied at each stage. Users don't have to manually configure agents - Ralph automatically selects and configures the appropriate agent for each layer, applying the correct constraints and context.

## Requirements
1. Map each layer to its agent type (L1-L7, L12 -> Planner; L8 -> Builder; L9-L11 -> Judge)
2. Load agent prompts from templates/agents/ directory
3. Assemble context package according to agent type and current layer
4. Apply tool permissions before agent execution
5. Pass handoff context from previous agent when applicable
6. Track which agent is currently active in _status.md
7. Handle agent completion and capture outputs
8. Support both full-session agents and quick validation agents
9. Include timeout handling for agents that stall
10. Log agent spawning events with timestamp and configuration

## Technical Approach
1. Create AgentSpawner module with spawnForLayer() function
2. Load prompt templates from filesystem
3. Implement context assembly functions per agent/layer combination
4. Integrate with tool permission enforcement from Epic 2 Feature 05
5. Use handoff protocol from Epic 2 Feature 04
6. Implement output capture and completion detection

## Acceptance Criteria
- [ ] Layer-to-agent mapping is implemented (Planner for L1-L7/L12, Builder for L8, Judge for L9-L11)
- [ ] Agent prompts are loaded from templates/agents/
- [ ] Context package is assembled correctly for each agent/layer combination
- [ ] Tool permissions are applied before agent execution
- [ ] Handoff context is passed when spawning after another agent
- [ ] Agent type is recorded in _status.md
- [ ] Agent outputs are captured on completion
- [ ] Agent spawning is logged with timestamps

## Planned Tasks
1. Create layer-to-agent mapping configuration
2. Implement prompt template loading from filesystem
3. Implement context assembly per agent/layer
4. Integrate tool permission enforcement
5. Implement output capture and completion detection
6. Add timeout handling and logging

## Edge Cases
- **Prompt template missing**: Agent type has no template file - error with clear message
- **Context too large**: Assembled context exceeds limits - implement truncation or summarization
- **Agent crashes mid-execution**: Detect incomplete execution, record state, enable retry
- **Wrong agent type requested**: Layer doesn't match agent type in handoff - validation error
- **Nested spawning**: Agent tries to spawn another agent - prevent recursive spawning
- **Rate limiting**: Too many agent spawns in short time - implement backoff

## Dependencies
- Epic 2 Feature 01-03 (Agent prompts) - need prompts to spawn agents
- Epic 2 Feature 04 (Handoff protocol) - need handoff for context passing
- Epic 2 Feature 05 (Tool permissions) - need permission enforcement
- Epic 3 Feature 01 (State machine) - need state to determine what to spawn

# Feature: Pass/Fail Routing and Cascade Logic

## Overview
Implement the routing logic that handles pass/fail results from the Judge agent. On PASS, advance to next layer. On FAIL, apply cascade rules: MINOR stays at current layer, MAJOR goes back one level in hierarchy, ESCALATE goes back two or more levels. Track iteration counts and enforce maximum retry limits.

## User Value
Intelligent routing ensures work is refined at the appropriate level. Minor code bugs don't require re-planning features, but fundamental misunderstandings do. Users get efficient iteration - rework happens where it's needed, not everywhere.

## Requirements
1. Parse Judge verdict from review output (PASS, ITERATE with severity)
2. On PASS: advance state to next layer per LAYER_CAKE.layers[].onPass
3. On ITERATE/MINOR: stay at current layer, increment iteration count, route to L8 (Builder)
4. On ITERATE/MAJOR: go back one hierarchy level per LAYER_CAKE.layers[].onFail.major
5. On ITERATE/ESCALATE: go back 2+ levels per LAYER_CAKE.layers[].onFail.escalate
6. Track iteration count per layer; enforce maxRetries (3) from LAYER_CAKE.failCascade
7. On max retries exceeded: notify human, request manual decision
8. Preserve iteration context (what was tried, what failed) across cascades
9. Update _status.md with routing decision and new position
10. Log all routing decisions with rationale

## Technical Approach
1. Create Router module with routeResult() function
2. Parse structured review output to extract verdict and severity
3. Implement routing logic per LAYER_CAKE layer definitions
4. Integrate iteration counting with state machine
5. Create human notification system for max retry scenarios
6. Log all routing decisions for debugging/audit

## Acceptance Criteria
- [ ] PASS verdict advances to next layer correctly
- [ ] MINOR verdict stays at layer and increments iteration count
- [ ] MAJOR verdict cascades to correct earlier layer per LAYER_CAKE
- [ ] ESCALATE verdict cascades 2+ layers back per LAYER_CAKE
- [ ] Iteration count is tracked and enforced (max 3)
- [ ] Human is notified when max retries exceeded
- [ ] Routing decisions are logged with reasoning
- [ ] _status.md is updated after each routing decision

## Planned Tasks
1. Implement verdict parsing from Judge review output
2. Implement PASS routing (advance to next layer)
3. Implement MINOR/MAJOR/ESCALATE cascade routing
4. Implement iteration counting and max retry enforcement
5. Implement human notification for exceeded retries
6. Test routing logic with simulated review outputs

## Edge Cases
- **Ambiguous verdict**: Judge output doesn't clearly say PASS or ITERATE - request clarification
- **Mixed severity issues**: Judge reports both MINOR and MAJOR issues - use highest severity
- **Cascade to L1**: ESCALATE from L4 would go before L1 - cap at L1 or L2
- **Iteration count after cascade**: Cascading to earlier layer - reset iteration count for that layer?
- **Human override**: Human wants to PASS despite Judge's ITERATE - support manual override
- **Build review vs Plan review**: Different cascade targets - use layer-specific onFail definitions

## Dependencies
- Epic 2 Feature 03 (Judge Agent) - Judge produces the verdicts to route
- Epic 3 Feature 01 (State machine) - routing updates state
- Epic 3 Feature 03 (Output validation) - validation also produces pass/fail

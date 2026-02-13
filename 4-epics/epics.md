# Layer Cake Meta-Test: Epic Definitions

**Project:** Layer Cake Self-Improvement
**Goal:** Use Layer Cake to improve Layer Cake itself
**Tier:** Small (3 epics, 3+ features per epic)

---

## Epic 1: Service Blueprint Enhancement

**Description:** Update and enhance the interactive service blueprint visualization (`v3-system-blueprint.html`) to serve as THE canonical, always-current representation of the Layer Cake methodology. This includes ensuring the LAYER_CAKE data structure is complete, the visual rendering is accurate, and the blueprint can be used programmatically by Ralph.

**User Value:** When the blueprint is the authoritative source of truth, methodology changes happen in one place and propagate everywhere. Developers and AI agents can reference a single interactive visualization to understand the entire system, reducing confusion and drift between documentation.

**Dependencies:** None (foundation epic)

**Risk Level:** Low

**Estimated Features:**
1. Audit and complete LAYER_CAKE data structure
2. Fix visual rendering inconsistencies
3. Add export/import functionality for Ralph consumption
4. Create layer detail modals with full specifications
5. Add real-time hierarchy calculator with tier presets

**Success Criteria:**
- LAYER_CAKE object contains complete data for all 12 layers, all 6 actors, all gates, and all cascade rules
- Every clickable cell opens a modal with accurate, complete layer specification
- Hierarchy calculator correctly computes total subtasks for all tier presets
- JSON export matches the data structure documented in service-blueprint-spec.md
- Visual layout matches the swimlane diagram in service-blueprint-spec.md

---

## Epic 2: Agent System Implementation

**Description:** Implement the Planner, Builder, and Judge agents as distinct Claude instances with role-specific prompts, tool permissions, and cognitive modes. This includes creating the prompt templates, defining context packages for each role, and establishing the handoff protocol between agents.

**User Value:** Specialized agents prevent the self-review bias that occurs when one agent both creates and reviews work. Each agent is optimized for its role: Planner for thoroughness, Builder for precision, Judge for rigor. This separation is the core of the GAN-inspired approach.

**Dependencies:** Epic 1 (agents need blueprint data for layer specifications)

**Risk Level:** Medium

**Estimated Features:**
1. Planner agent prompt and context package (L1-L7, L12)
2. Builder agent prompt and context package (L8)
3. Judge agent prompt and context package (plan reviews, L9-L11)
4. Agent handoff protocol with context preservation
5. Tool permission enforcement per agent role

**Success Criteria:**
- Each agent has a complete, tested system prompt that enforces its role
- Context packages are defined and minimal (right information, no waste)
- Handoff prompts successfully transfer state between agents without loss
- Tool permissions are enforced (e.g., Judge cannot write files)
- Agent prompts reference LAYER_CAKE data from Epic 1

---

## Epic 3: Orchestration Layer (Ralph)

**Description:** Implement Ralph as the orchestration layer that spawns agents, manages state via the filesystem, routes pass/fail results, and handles session recovery. Ralph reads _status.md, spawns the appropriate agent, validates outputs, and advances or cascades based on results.

**User Value:** Ralph enables autonomous operation across session boundaries. It handles the complexity of routing, state management, and crash recovery so that humans only need to intervene at designated gates. This is what makes Layer Cake "set it and forget it" for execution.

**Dependencies:** Epic 2 (Ralph needs agents to orchestrate)

**Risk Level:** High

**Estimated Features:**
1. State machine implementation using filesystem
2. Agent spawning with role-appropriate prompts
3. Output validation and minimum count enforcement
4. Pass/fail routing with cascade logic
5. Session recovery and _status.md reconciliation

**Success Criteria:**
- Ralph can spawn each agent type with correct prompts and tools
- _status.md is updated accurately at every layer transition
- Minimum counts are enforced (e.g., 3+ epics at L4, 10+ quotes at L2)
- Cascade routing works correctly (MINOR->L8, MAJOR->spec layer, ESCALATE->2+ back)
- Session recovery correctly resumes from _status.md state

---

## Epic Dependency Diagram

```
+----------------------------------+
|   Epic 1: Service Blueprint      |
|   (Foundation - LAYER_CAKE data) |
+----------------------------------+
              |
              | provides layer specs,
              | actor definitions,
              | cascade rules
              v
+----------------------------------+
|   Epic 2: Agent System           |
|   (Planner, Builder, Judge)      |
+----------------------------------+
              |
              | provides agents
              | to orchestrate
              v
+----------------------------------+
|   Epic 3: Orchestration (Ralph)  |
|   (State, spawning, routing)     |
+----------------------------------+
```

---

## Execution Order Recommendation

**Order: Epic 1 -> Epic 2 -> Epic 3**

**Rationale:**

1. **Epic 1 first** because:
   - It has no dependencies
   - It produces the LAYER_CAKE data structure that Epic 2 needs
   - It can be validated independently (open HTML, verify visually)
   - Low risk means quick wins and momentum

2. **Epic 2 second** because:
   - It depends on Epic 1's layer specifications
   - Agent prompts must reference accurate methodology data
   - Agents can be tested individually before orchestration
   - Medium risk - some iteration expected on prompt engineering

3. **Epic 3 last** because:
   - It depends on Epic 2's agents
   - Orchestration without agents is meaningless
   - Highest risk - integrates all components
   - Natural capstone that ties everything together

**Alternative Consideration:**

If Epic 1 proves more complex than expected, a subset approach could work:
- Epic 1a: LAYER_CAKE data structure only (no visual fixes)
- Epic 2: Agent system (using data from 1a)
- Epic 1b: Visual enhancements (in parallel with Epic 3)
- Epic 3: Orchestration

This parallelization would only be needed if the blueprint visual work blocks agent development significantly.

---

## Risk Assessment Summary

| Epic | Risk | Primary Risk Factor | Mitigation |
|------|------|---------------------|------------|
| 1 | Low | Existing HTML/JS may have bugs | Incremental testing |
| 2 | Medium | Prompt engineering iteration | Test each agent in isolation |
| 3 | High | Integration complexity | Build on proven Epic 1+2 foundation |

---

## Total Feature Estimate

- Epic 1: 5 features
- Epic 2: 5 features
- Epic 3: 5 features
- **Total: 15 features**

At 3 tasks per feature and 2 subtasks per task, this yields:
**15 features x 3 tasks x 2 subtasks = 90 subtasks**

This is appropriate for a "Small" tier project (minimum 54 subtasks).

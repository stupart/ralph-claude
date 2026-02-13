# Subtasks: Audit and Fix Actors, Hierarchy, Gates, and Cascade

**Parent Feature:** LAYER_CAKE Data Structure Audit
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Fix Actors and Hierarchy Definitions

**Action:** Update LAYER_CAKE.actors to have all 6 actors (human, planner, builder, judge, reviewer, analyst) with id, label, color, role fields, and update LAYER_CAKE.hierarchy to have 4 levels (epic, feature, task, subtask) with minCount and timeScale.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update actors object and hierarchy object within LAYER_CAKE

**Code Pattern/API:** actors: {planner: {id, label, color, role}, ...}, hierarchy: {epic: {minCount: 3, timeScale: "weeks"}, ...}

**Verification:** LAYER_CAKE.getActor("planner"), getActor("builder"), getActor("judge") all return complete objects; hierarchy has 4 levels

---

## Subtask 2: Fix Gates and FailCascade Definitions

**Action:** Update LAYER_CAKE.gates to list human gate layer IDs (L3, L7) and review layers, and update LAYER_CAKE.failCascade with maxRetries, routing rules for minor/major/escalate, and human notification triggers.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update gates array and failCascade object within LAYER_CAKE

**Code Pattern/API:** gates: {human: ["L3", "L7"], review: ["L9", "L10", "L11"]}, failCascade: {maxRetries: 3, ...}

**Verification:** LAYER_CAKE.gates.human includes L3 and L7; failCascade.maxRetries === 3; all cascade targets are valid layer IDs

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

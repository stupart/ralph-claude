# Subtasks: Implement Planner-Judge Handoff (Plan Review Cycle)

**Parent Feature:** Agent Handoff Protocol
**Parent Epic:** Agent Specialization

---

## Subtask 1: Implement Planner-to-Judge Serialization

**Action:** Create function to serialize Planner output for Judge review: spec content, requirements summary, iteration count, layer context.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/handoff/planner-judge.js` - Planner-Judge handoff functions

**Code Pattern/API:** function serializePlannerToJudge(layer, artifacts, iterationCount) { return { type: 'planReview', ... }; }

**Verification:** Function outputs valid handoff data matching schema; includes all plan artifacts; preserves iteration count

---

## Subtask 2: Implement Judge-to-Planner Serialization

**Action:** Add function to serialize Judge feedback for Planner iteration: issues list, severity classifications, specific revision requests.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/handoff/planner-judge.js` - Add Judge-to-Planner function

**Code Pattern/API:** function serializeJudgeToPlanner(reviewOutput) { return { type: 'planIteration', issues: [...], ... }; }

**Verification:** Function outputs valid handoff data; includes all issues with severity; iteration count incremented

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

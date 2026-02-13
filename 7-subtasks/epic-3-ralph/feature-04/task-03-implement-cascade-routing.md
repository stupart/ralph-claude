# Subtasks: Implement Cascade Routing (MINOR/MAJOR/ESCALATE)

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Implement MINOR Routing

**Action:** Add MINOR cascade handling: stay at current layer, increment iteration count, route back to Builder (L8) for fixes.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/router.js` - Add MINOR routing

**Code Pattern/API:** if (severity === 'MINOR') { StateManager.iterate(); return { nextLayer: 'L8', action: 'fix' }; }

**Verification:** MINOR at L9 increments iteration count; routes to L8; state stays at L9 for re-review

---

## Subtask 2: Implement MAJOR and ESCALATE Routing

**Action:** Add MAJOR and ESCALATE cascade handling: MAJOR goes back one hierarchy level (onFail.major), ESCALATE goes back two+ levels (onFail.escalate).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/router.js` - Add MAJOR/ESCALATE routing

**Code Pattern/API:** if (severity === 'MAJOR') { const target = LAYER_CAKE.getLayer(layer).onFail.major; StateManager.cascade(target); }

**Verification:** MAJOR at L9 goes to onFail.major target; ESCALATE goes to onFail.escalate target; state updated correctly

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

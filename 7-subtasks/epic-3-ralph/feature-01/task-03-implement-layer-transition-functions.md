# Subtasks: Implement Layer Transition Functions

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Implement advance() and iterate() Functions

**Action:** Create advance() function to move to next layer (L4->L5) and iterate() function to stay at current layer with incremented iteration count.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add advance() and iterate()

**Code Pattern/API:** advance() { state.current_layer = LAYER_CAKE.getLayer(state.current_layer).onPass; state.iteration_count = 0; } iterate() { state.iteration_count++; }

**Verification:** advance() moves L4->L5; iterate() stays at L9 and increments count; both update _status.md

---

## Subtask 2: Implement cascade() Function

**Action:** Create cascade(targetLayer) function that moves state back to an earlier layer, used for MAJOR/ESCALATE routing from review failures.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add cascade() function

**Code Pattern/API:** cascade(targetLayer) { state.current_layer = targetLayer; state.iteration_count = 0; state.phase = getPhase(targetLayer); }

**Verification:** cascade("L6") moves from L9 to L6; resets iteration count; updates phase correctly; updates _status.md

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

# Subtasks: Add Clean Start Option and Logging

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Implement Clean Start Flag

**Action:** Add cleanStart(projectPath) function that ignores existing state and starts fresh at L1, creating new _status.md with initial state.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Add clean start option

**Code Pattern/API:** function cleanStart(projectPath) { const initialState = { current_layer: 'L1', iteration_count: 0, phase: 'understand' }; StateManager.write(projectPath, initialState); }

**Verification:** Clean start wipes/ignores existing _status.md; creates fresh state at L1; existing artifacts preserved but state reset

---

## Subtask 2: Add Comprehensive Recovery Logging

**Action:** Add logging throughout recovery process: detection results, reconciliation findings, plan details, execution steps, and final outcome.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Add comprehensive logging

**Code Pattern/API:** function log(step, details) { console.log(`[${new Date().toISOString()}] Recovery: ${step}`, details); }

**Verification:** All recovery decisions logged with timestamps; logs are useful for debugging; complete audit trail available

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

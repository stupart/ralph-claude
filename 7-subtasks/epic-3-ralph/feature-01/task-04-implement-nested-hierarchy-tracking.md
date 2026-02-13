# Subtasks: Implement Nested Hierarchy Position Tracking

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Add Hierarchy Position to State Schema

**Action:** Extend state object and _status.md schema to track position within hierarchy: currentEpic (of N), currentFeature (of M), currentTask (of P), currentSubtask (of Q).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add hierarchy position fields
- MODIFY: `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` - Document new fields

**Code Pattern/API:** state.position = { epicIndex: 0, epicCount: 3, featureIndex: 0, featureCount: 3, ... }

**Verification:** State tracks current epic, feature, task indices; indices are 0-based; counts reflect actual artifact counts

---

## Subtask 2: Implement advanceItem() Function

**Action:** Create advanceItem() function to move to next item at current hierarchy level, rolling over to next parent when current level completes.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add advanceItem() function

**Code Pattern/API:** advanceItem() { if (canAdvanceSubtask()) advanceSubtask(); else if (canAdvanceTask()) advanceTask(); ... }

**Verification:** advanceItem() moves to next subtask; rolls to next task when subtasks complete; validates against actual counts

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

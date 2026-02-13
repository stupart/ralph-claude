# Subtasks: Implement Count Validation for Each Hierarchy Level

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Count Validator Module

**Action:** Create count-validator.js module with validation functions for each level: validateEpics(), validateFeatures(), validateTasks(), validateSubtasks().

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` - Count validation functions

**Code Pattern/API:** function validateEpics(projectPath) { const count = countFiles(projectPath, '4-epics/*.md'); return count >= 3 ? pass() : fail(`Only ${count} epics, need 3+`); }

**Verification:** validateEpics with 2 epics returns failure; with 4 epics returns success; error message is clear

---

## Subtask 2: Add Partial Completion Reporting

**Action:** Enhance validators to report partial completion status (e.g., "2 of 3 required epics complete") for better progress visibility.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` - Add partial completion

**Code Pattern/API:** return { passed: count >= required, count, required, message: `${count}/${required} ${level}s complete` };

**Verification:** Validator reports current vs required count; partial completion is clearly communicated; helps track progress

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

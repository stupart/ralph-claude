# Subtasks: Implement _status.md Detection and Parsing

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create RecoveryManager Module

**Action:** Create recovery-manager.js module with detectStatus(projectPath) function that checks for existing _status.md and returns its presence/absence status.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Recovery management module

**Code Pattern/API:** function detectStatus(projectPath) { const statusPath = path.join(projectPath, '_status.md'); return fs.existsSync(statusPath) ? 'found' : 'missing'; }

**Verification:** Detects existing _status.md; returns 'missing' for new projects; handles path edge cases

---

## Subtask 2: Add Status Parsing and Validation

**Action:** Add parseStatus(projectPath) function that reads and validates _status.md format, handling corrupted files gracefully with error recovery.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Add parsing and validation

**Code Pattern/API:** function parseStatus(path) { try { return parse(fs.readFileSync(path)); } catch (e) { return { corrupted: true, error: e.message }; } }

**Verification:** Parses valid files correctly; detects corruption; returns structured error for corrupted files

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

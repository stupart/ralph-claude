# Subtasks: Implement StateManager Read and Write

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Implement StateManager.read() Function

**Action:** Create StateManager module with read() function that parses _status.md file and returns a structured state object, handling missing/corrupted files gracefully.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - StateManager module with read()

**Code Pattern/API:** const StateManager = { read(projectPath) { const content = fs.readFileSync(path.join(projectPath, '_status.md')); return parseStatus(content); } }

**Verification:** StateManager.read() returns current state object; handles missing file with error; handles corrupted file gracefully

---

## Subtask 2: Implement StateManager.write() Function

**Action:** Add write() function that updates _status.md atomically using temp file + rename pattern to prevent corruption.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add write() function

**Code Pattern/API:** write(projectPath, state) { fs.writeFileSync(tempPath, serialize(state)); fs.renameSync(tempPath, statusPath); }

**Verification:** StateManager.write() updates file atomically; interrupted write doesn't corrupt; file content matches state

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

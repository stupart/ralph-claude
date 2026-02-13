# Subtasks: Create Error Messages and Logging

**Parent Feature:** Tool Permission Enforcement
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Permission Error Messages

**Action:** Create PermissionError class and clear, human-readable error message templates explaining why a tool is forbidden for the current role.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/permissions/permission-errors.js` - Error class and message templates

**Code Pattern/API:** class PermissionError extends Error { constructor(role, tool) { super(`Tool "${tool}" is not permitted for ${role} role. Reason: ${getReason(role, tool)}`); } }

**Verification:** Error messages are human-readable; explain both what was blocked and why; include role and tool name

---

## Subtask 2: Create Permission Logger

**Action:** Create permission logger that logs all permission checks (allowed and denied) with timestamp, agent role, tool name, and result for debugging.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/permissions/permission-logger.js` - Permission logging utility

**Code Pattern/API:** function logPermissionCheck(role, tool, allowed) { console.log(`[${new Date().toISOString()}] Permission: ${role} -> ${tool} = ${allowed ? 'ALLOWED' : 'DENIED'}`); }

**Verification:** Logs include timestamp, agent, tool, and result; both allowed and denied actions are logged; logs are readable

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

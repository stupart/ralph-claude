# Subtasks: Implement Permission Check Function

**Parent Feature:** Tool Permission Enforcement
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create checkPermission Function

**Action:** Create checkPermission(agentRole, toolName) function that loads config, checks if tool is allowed for role, and returns {allowed: boolean, reason: string}.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/permissions/check-permission.js` - Permission check function

**Code Pattern/API:** function checkPermission(role, tool) { const allowed = config[role]?.includes(tool); return { allowed, reason: allowed ? '' : `${tool} not permitted for ${role}` }; }

**Verification:** Function returns allowed:true for permitted tools; returns allowed:false with reason for denied tools

---

## Subtask 2: Add Unknown Tool Handling

**Action:** Enhance checkPermission to handle unknown tools (deny by default) and unknown roles (error), with appropriate error messages.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/permissions/check-permission.js` - Add edge case handling

**Code Pattern/API:** if (!config[role]) throw new Error(`Unknown role: ${role}`); if (!allTools.includes(tool)) return { allowed: false, reason: 'Unknown tool' };

**Verification:** Unknown tools are denied by default; unknown roles throw clear error; edge cases handled gracefully

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

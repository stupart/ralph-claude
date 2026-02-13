# Subtasks: Test Permission Enforcement for Each Role

**Parent Feature:** Tool Permission Enforcement
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Test Cases for Each Role

**Action:** Create test document with test cases verifying: Planner cannot use Bash/Edit, Builder has all tools, Judge cannot use Write/Edit.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/permission-enforcement-test.md` - Permission enforcement test cases

**Code Pattern/API:** Test: checkPermission('planner', 'Bash') -> Expected: {allowed: false}; checkPermission('builder', 'Edit') -> Expected: {allowed: true}

**Verification:** Test cases cover each agent role; expected results documented; covers all tool permissions

---

## Subtask 2: Add Edge Case Tests

**Action:** Add test cases for edge cases: MCP tools (mcp__*), unknown tools, tool aliases, and bypass mode behavior.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/tests/permission-enforcement-test.md` - Add edge case tests

**Code Pattern/API:** Edge case: checkPermission('judge', 'mcp__chrome__screenshot') -> Expected behavior documented

**Verification:** Edge cases documented; MCP tools handled correctly; unknown tools denied; bypass mode tested

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

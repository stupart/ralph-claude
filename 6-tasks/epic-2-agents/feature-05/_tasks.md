# Tasks: Tool Permission Enforcement

## Task 1: Design Permission Configuration Schema

**What it accomplishes:** Creates a configuration file defining allowed tools for each agent role (Planner, Builder, Judge) in a clear, auditable format.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/config/tool-permissions.json` (create)
- `/Users/tylerstupart/ralph-claude/docs/tool-permissions.md` (create documentation)

**Dependencies:** None

**Verification:** Config defines tools for Planner (Read, Write, Glob, Grep), Builder (all), Judge (Read, Glob, Grep, Bash, /chrome); format is JSON and easily auditable.

---

## Task 2: Implement Permission Check Function

**What it accomplishes:** Creates a checkPermission(agentRole, toolName) function that returns true/false based on the configuration, with clear reasoning for denials.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/permissions/check-permission.js` (create)

**Dependencies:** Task 1 (need configuration to check against)

**Verification:** Function returns true for allowed tools; returns false with reason for denied tools; handles unknown tools (deny by default).

---

## Task 3: Integrate Permission Checks into Tool Execution

**What it accomplishes:** Creates a wrapper or hook that runs permission check before any tool execution, preventing forbidden tools from running.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/permissions/enforce-permissions.js` (create)

**Dependencies:** Task 2 (need check function)

**Verification:** Wrapper intercepts tool calls; blocked tools produce error before execution; allowed tools proceed normally.

---

## Task 4: Create Error Messages and Logging

**What it accomplishes:** Implements clear error messages explaining why a tool is forbidden for the current role, and logs all permission checks (allowed and denied) for debugging.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/permissions/permission-errors.js` (create)
- `/Users/tylerstupart/ralph-claude/src/permissions/permission-logger.js` (create)

**Dependencies:** Tasks 2-3 (need check and enforcement in place)

**Verification:** Error messages are human-readable; messages explain both what was blocked and why; logs include timestamp, agent, tool, and result.

---

## Task 5: Add Development Bypass Mechanism

**What it accomplishes:** Implements an environment variable or flag (RALPH_PERMISSION_BYPASS=true) that allows bypassing permissions during development, with clear warnings when active.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/permissions/enforce-permissions.js` (modify to add bypass)

**Dependencies:** Task 3 (need enforcement to bypass)

**Verification:** Setting bypass flag allows all tools; bypass logs prominent warning on each use; bypass is clearly not for production.

---

## Task 6: Test Permission Enforcement for Each Role

**What it accomplishes:** Creates test cases verifying Planner cannot use Bash/Edit, Builder has all tools, and Judge cannot use Write/Edit, documenting expected behavior.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/permission-enforcement-test.md` (create)

**Dependencies:** Tasks 1-5 (complete permission system)

**Verification:** Test cases cover each agent role; expected results documented; includes edge cases (MCP tools, unknown tools, tool aliases).

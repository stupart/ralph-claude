# Subtasks: Implement Context Assembly

**Parent Feature:** Agent Spawning System
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Context Assembler Module

**Action:** Create context-assembler.js module with assembleContext(agentType, layerId, projectPath) function that gathers appropriate files based on context rules.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/spawner/context-assembler.js` - Context assembly module

**Code Pattern/API:** function assembleContext(agentType, layerId, projectPath) { const rules = loadContextRules(agentType); return gatherFiles(projectPath, rules[layerId]); }

**Verification:** Context for Planner L4 includes synthesis; context for Builder includes only task spec; context respects size limits

---

## Subtask 2: Add Context Size Validation

**Action:** Add logic to validate context size and handle cases where context would exceed limits (prioritization, truncation, warnings).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/spawner/context-assembler.js` - Add size validation

**Code Pattern/API:** if (contextSize > MAX_CONTEXT_SIZE) { context = prioritizeAndTruncate(context, MAX_CONTEXT_SIZE); warn('Context truncated'); }

**Verification:** Context size is checked; oversized context is handled gracefully; warnings issued for truncation

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

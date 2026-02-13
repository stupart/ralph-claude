# Subtasks: Implement Planner-Builder Handoff (Start Build)

**Parent Feature:** Agent Handoff Protocol
**Parent Epic:** Agent Specialization

---

## Subtask 1: Implement Planner-to-Builder Serialization

**Action:** Create function to serialize approved plan for Builder: task specification, file paths to modify, acceptance criteria - in minimal focused format.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/handoff/planner-builder.js` - Planner-Builder handoff functions

**Code Pattern/API:** function serializePlannerToBuilder(taskSpec) { return { type: 'buildStart', spec: taskSpec, files: [...], criteria: [...] }; }

**Verification:** Function outputs task-focused context; includes only files mentioned in spec; excludes broader project context

---

## Subtask 2: Add Context Minimization Logic

**Action:** Add logic to extract only the minimum required context from the full project: referenced files, relevant tests, nothing else.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/handoff/planner-builder.js` - Add context minimization

**Code Pattern/API:** function extractMinimalContext(spec) { const files = parseFilesFromSpec(spec); return files.filter(f => exists(f)); }

**Verification:** Handoff includes only spec-referenced files; no broader project docs; context is minimal and focused

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

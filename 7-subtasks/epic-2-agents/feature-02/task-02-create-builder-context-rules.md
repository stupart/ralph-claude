# Subtasks: Create Context Loading Rules for Task Focus

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Define Minimal Context Loading Strategy

**Action:** Create context rules document specifying that Builder receives only: current task/subtask spec, files explicitly mentioned in spec, and relevant test files - nothing else.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/builder-context-rules.md` - Builder context loading rules

**Code Pattern/API:** Required: task spec file; Conditional: files listed in spec's "Files to modify"; Excluded: broader project docs, other tasks

**Verification:** Rules are explicit about what's included; rules explicitly exclude project-wide context; rules prevent context bloat

---

## Subtask 2: Add Context Size Guidelines

**Action:** Add guidelines for maximum context size and what to do when task spec references too many files (prioritization, chunking strategies).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder-context-rules.md` - Add size guidelines

**Code Pattern/API:** Max files: 5-10; Priority order: spec > tests > implementation files; Chunking: do subtasks sequentially

**Verification:** Guidelines prevent context overflow; prioritization is clear; document is actionable for spawner

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

# Subtasks: Test Builder Prompt with Sample Task Specs

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Test Procedure and Sample Task

**Action:** Create test procedure document and a sample task specification file that can be used to verify Builder follows specs exactly and handles edge cases.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/builder-prompt-test.md` - Test procedure for Builder prompt
- CREATE: `/Users/tylerstupart/ralph-claude/tests/sample-task-spec.md` - Sample task specification

**Code Pattern/API:** Sample task: "Add input validation to user form"; includes files to modify, acceptance criteria, test commands

**Verification:** Test procedure exists; sample task is realistic; expected behaviors documented

---

## Subtask 2: Document Edge Cases and Expected Behaviors

**Action:** Add edge case scenarios to test document: ambiguous spec handling, no tests provided, conflicting requirements, large scope tasks.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/tests/builder-prompt-test.md` - Add edge case scenarios

**Code Pattern/API:** Edge case: "Spec says add feature X but doesn't specify UI" -> Expected: Builder asks for clarification

**Verification:** Edge cases documented; expected behaviors for each case defined; test can be run manually

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

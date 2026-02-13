# Subtasks: Add Test Execution and Commit Protocol

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Add Test Execution Instructions

**Action:** Add section to Builder prompt specifying: run tests after each subtask, stop immediately on test failure, report failure details before proceeding.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add test execution section

**Code Pattern/API:** ## After Each Subtask\n1. Run relevant tests\n2. If tests fail: STOP, report failure, wait for guidance\n3. If tests pass: proceed to commit

**Verification:** Test execution instructions are clear; stop-on-failure behavior is explicit; failure reporting format defined

---

## Subtask 2: Add Commit Message Format

**Action:** Add commit protocol section specifying the commit message format `[L8] {task_name}` with examples and guidance on what to include in commit messages.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add commit protocol section

**Code Pattern/API:** ## Commit Format\n`[L8] {task_name}: {brief description}`\nExample: `[L8] Add user authentication: implement JWT token validation`

**Verification:** Commit format is documented with examples; format includes layer tag; examples are realistic

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

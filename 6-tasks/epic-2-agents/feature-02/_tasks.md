# Tasks: Builder Agent Prompt and Context Package

## Task 1: Design Builder System Prompt Template

**What it accomplishes:** Creates the Builder system prompt establishing implementation-focused identity, cognitive mode (accept_edits), core responsibilities, and explicit "no improvisation" constraints.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` (create)

**Dependencies:** None

**Verification:** Prompt establishes Builder identity; explicitly forbids improvisation; includes full tool permissions (Read, Write, Edit, Bash, Glob, Grep); emphasizes following spec exactly.

---

## Task 2: Create Context Loading Rules for Task Focus

**What it accomplishes:** Defines the minimal context loading strategy for Builder: current task spec, referenced code files only, and relevant tests - preventing context bloat.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/builder-context-rules.md` (create)

**Dependencies:** Task 1 (need to understand Builder scope)

**Verification:** Rules specify loading only task spec and files mentioned in spec; explicitly excludes broader project context; keeps context minimal.

---

## Task 3: Add Test Execution and Commit Protocol

**What it accomplishes:** Adds specific instructions for running tests after each subtask, stopping on test failure, and using the commit message format `[L8] {task_name}`.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` (modify to add test and commit sections)

**Dependencies:** Task 1 (need base prompt)

**Verification:** Prompt includes test execution instructions; specifies stop-on-failure behavior; commit format is documented with examples.

---

## Task 4: Add Iteration Response Handling

**What it accomplishes:** Adds instructions for how Builder should handle feedback from Judge, incorporating specific fixes rather than re-implementing from scratch.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` (modify to add iteration handling)

**Dependencies:** Task 1 (need base prompt)

**Verification:** Prompt includes section on receiving Judge feedback; instructions for targeted fixes; prevents complete rewrites for minor issues.

---

## Task 5: Test Builder Prompt with Sample Task Specs

**What it accomplishes:** Creates sample task specifications and a test procedure to verify Builder behavior, ensuring it follows specs exactly and handles edge cases appropriately.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/builder-prompt-test.md` (create)
- `/Users/tylerstupart/ralph-claude/tests/sample-task-spec.md` (create sample)

**Dependencies:** Tasks 1-4 (complete prompt needed)

**Verification:** Test procedure exists; sample task spec is realistic; expected behaviors are documented for normal case and edge cases (no tests, ambiguous spec).

---

## Task 6: Document Tool Permission Rationale

**What it accomplishes:** Creates documentation explaining why Builder has full tool access while other agents are restricted, supporting the permission enforcement feature.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/docs/builder-permissions-rationale.md` (create)

**Dependencies:** Task 1 (need to understand Builder role)

**Verification:** Document explains each tool Builder needs; contrasts with Planner (no Bash/Edit) and Judge (no Write/Edit); rationale is clear.

---

## Task 7: Implement Commit Protocol

**What it accomplishes:** Implements the Layer Cake commit strategy including commits at task boundaries, `[L{N}]` message format prefixes, and WIP commit handling for interrupted work sessions.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` (modify to add detailed commit protocol)
- `/Users/tylerstupart/ralph-claude/templates/protocols/commit-protocol.md` (create)

**Dependencies:** Task 3 (initial commit format mentioned there)

**Verification:** Commit protocol specifies when to commit (task completion, before switching contexts); message format uses `[L8] {task_name}` pattern; WIP commits are documented for session interruptions; protocol integrates with test execution requirements.

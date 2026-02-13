# Subtasks: Implement Commit Protocol

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent System

---

## Subtask 1: Define Commit Timing Rules

**Action:** Document when Builder should create commits during task execution.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/protocols/commit-protocol.md` - Comprehensive commit timing and format rules

**Content to Include:**
- Commit at task completion (after tests pass)
- Commit before switching to a different task
- No commits mid-subtask unless session is ending
- WIP commit format for session interruptions: `[L8 WIP] {task_name} - {reason}`

**Verification:** Protocol document exists with clear timing rules; covers normal completion and interruption cases.

---

## Subtask 2: Implement Layer-Prefixed Message Format

**Action:** Define the commit message format with layer prefixes for all agent types.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/protocols/commit-protocol.md` - Add message format section

**Message Format:**
```
[L{N}] {brief_description}

{optional_body_with_details}

Task: {task_file_path}
```

**Layer Prefix Examples:**
- `[L4]` - Epic creation (Planner)
- `[L5]` - Feature creation (Planner)
- `[L6]` - Task creation (Planner)
- `[L7]` - Subtask creation (Planner)
- `[L8]` - Implementation (Builder)
- `[L12]` - Retrospective (Planner)

**Verification:** Message format is documented with examples for each layer; task reference is included.

---

## Subtask 3: Add WIP Commit Protocol for Interrupted Sessions

**Action:** Document how Builder handles session interruptions requiring mid-task commits.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/protocols/commit-protocol.md` - Add WIP section

**WIP Protocol:**
- Detect session ending (timeout, user interrupt)
- Stage all changed files
- Use WIP prefix: `[L8 WIP] {task_name} - session interrupted`
- Record resume point in commit message body
- On resume: squash WIP commit into final task commit

**Verification:** WIP protocol covers detection, commit format, and resume instructions.

---

## Subtask 4: Integrate Commit Protocol into Builder Prompt

**Action:** Add commit protocol reference and summary to Builder system prompt.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add commit protocol section

**Section Content:**
```markdown
## Commit Protocol

Follow the Layer Cake commit protocol:

1. **When to Commit:**
   - After completing each task (all subtasks done, tests pass)
   - Before switching context to a different task
   - If session is ending mid-task (use WIP format)

2. **Message Format:**
   - Use prefix: `[L8] {task_name}`
   - Include task file path in body
   - Be specific about what was implemented

3. **WIP Commits:**
   - Only if session interrupted mid-task
   - Use: `[L8 WIP] {task_name} - {reason}`
   - Document resume point

See: templates/protocols/commit-protocol.md for full details.
```

**Verification:** Builder prompt references commit protocol; includes summary of key rules; links to full protocol document.

---

## Subtask 5: Add Test-Before-Commit Requirement

**Action:** Ensure commit protocol integrates with test execution requirements.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/protocols/commit-protocol.md` - Add test integration section

**Test Integration:**
- Run tests before committing (except WIP commits)
- If tests fail, do not commit
- Fix issues first, then commit
- WIP commits are exception: can commit with failing tests if session ending

**Verification:** Protocol explicitly requires tests before commits; exception for WIP is documented.

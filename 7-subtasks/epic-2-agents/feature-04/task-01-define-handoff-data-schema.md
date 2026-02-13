# Subtasks: Define Handoff Data Structure Schema

**Parent Feature:** Agent Handoff Protocol
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create JSON Schema for Handoff Data

**Action:** Create a formal JSON Schema defining the handoff data structure including: currentLayer, iterationCount, projectContext, recentArtifacts, feedbackHistory, nextAgentType.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/handoff-schema.json` - JSON Schema for handoff data

**Code Pattern/API:** JSON Schema draft-07 with required fields: currentLayer, iterationCount, nextAgent; optional: feedbackHistory, artifacts

**Verification:** Schema is valid JSON Schema; defines all required fields; includes type constraints

---

## Subtask 2: Create Documentation for Handoff Schema

**Action:** Create documentation explaining each field's purpose, when it's populated, and how agents should use it when receiving a handoff.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/handoff-schema.md` - Handoff schema documentation

**Code Pattern/API:** For each field: description, type, example value, which transitions populate it

**Verification:** Documentation covers all schema fields; explains usage context; provides clear examples

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

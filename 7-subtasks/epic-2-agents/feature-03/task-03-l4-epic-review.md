# Subtasks: Create L4 Epic Review Prompt with Scope Coverage

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Prompt with Synthesis Artifact Loading

**Action:** Create the L4 Epic Review prompt with protocol for loading synthesis artifacts (JTBD, patterns, architecture decisions) to verify they trace forward to epics.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` - L4 Epic Review prompt

**Code Pattern/API:** ## Context Loading Protocol\n1. Read JTBD from `/4-synthesis/jtbd.md`\n2. Read patterns from `/4-synthesis/patterns.md`\n3. Read epics from `/5-epics/`\n4. Verify traceability

**Verification:** Prompt loads all relevant synthesis files; specifies which artifacts must map to epics; loading order documented

---

## Subtask 2: Add JTBD to Epic Traceability Checklist

**Action:** Add checklist ensuring every JTBD has at least one epic addressing it, no architectural decisions are dropped, and epic scope is comprehensive.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` - Add traceability checklist

**Code Pattern/API:** ## Traceability Checklist\n- [ ] Each JTBD maps to 1+ epics\n- [ ] Architectural decisions reflected\n- [ ] No synthesis concepts dropped\n- [ ] Epic scope comprehensive

**Verification:** Checklist covers JTBD traceability; identifies scope gaps; provides escalation criteria for missing coverage

---

## Subtask 3: Add Scope Gap Identification Criteria

**Action:** Add specific criteria for identifying and flagging when synthesis concepts are missing from epics, with severity classification.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` - Add gap identification section

**Code Pattern/API:** ## Scope Gap Severity\n- MAJOR: JTBD with no epic\n- MAJOR: Architectural decision ignored\n- MINOR: Pattern partially addressed

**Verification:** Gap types enumerated; severity levels assigned; escalation vs iteration guidance included

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met

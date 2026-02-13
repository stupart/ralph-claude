# Subtasks: Create L10-L11 Integration and Final Review Prompts

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create L10 Epic Integration Prompt

**Action:** Create the L10 Epic Integration Review prompt for verifying all features within an epic work together correctly, including cross-feature testing protocols.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L10-epic-review.md` - L10 Epic Integration Review prompt

**Code Pattern/API:** ## Integration Testing Protocol\n1. Test feature A independently\n2. Test feature B independently\n3. Test A + B together\n4. Verify no regressions, data flows correctly

**Verification:** Prompt covers cross-feature interactions; identifies integration points; regression testing included

---

## Subtask 2: Create L11 Final Review with Ship-Worthiness Check

**Action:** Create the L11 Final Review prompt with full scope verification against original synthesis and "would I be proud to ship this?" assessment.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L11-final-review.md` - L11 Final Review prompt

**Code Pattern/API:** ## Ship-Worthiness Check\n- [ ] All JTBD addressed by shipped features\n- [ ] No critical bugs outstanding\n- [ ] UX polished, not just functional\n- [ ] Would I be proud to ship this? (gut check)

**Verification:** Prompt traces back to original synthesis; includes subjective quality gate; escalation path for "not ready"

---

## Subtask 3: Add Full Scope Traceability Verification

**Action:** Add protocol for L11 to verify complete traceability from brain dump through synthesis, epics, features to shipped code.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L11-final-review.md` - Add full traceability verification

**Code Pattern/API:** ## Full Traceability Check\n1. Load original brain dump themes\n2. Verify each theme -> synthesis -> epic -> features\n3. Flag any dropped scope\n4. Assess whether drops were intentional vs lost

**Verification:** Traceability protocol is complete; covers entire pipeline; distinguishes intentional scope cuts from accidental drops

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met

# Subtasks: Create L9 Feature Review Prompt

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Prompt with /chrome Testing Protocol

**Action:** Create the L9 Feature Review prompt with step-by-step /chrome testing protocol for verifying implemented features work correctly in the browser.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L9-feature-review.md` - L9 Feature Review prompt

**Code Pattern/API:** ## /chrome Testing Protocol\n1. Open /chrome with feature URL\n2. Execute each acceptance criteria step\n3. Document PASS/FAIL for each\n4. Capture screenshots for failures

**Verification:** Protocol is step-by-step; covers all major feature paths; failure documentation explicit

---

## Subtask 2: Add Acceptance Criteria Verification Checklist

**Action:** Add checklist structure for verifying each acceptance criterion from the feature definition, including UX quality assessment.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L9-feature-review.md` - Add acceptance criteria checklist

**Code Pattern/API:** ## Acceptance Criteria Verification\nFor each criterion from feature definition:\n- [ ] Functionally works\n- [ ] Edge cases handled\n- [ ] Error states graceful\n- [ ] UX feels natural

**Verification:** Checklist references feature's acceptance criteria; UX rubric included; severity classification for failures

---

## Subtask 3: Add UX Quality Rubric

**Action:** Add specific UX quality criteria for feature review: responsiveness, accessibility basics, visual consistency, error messaging.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L9-feature-review.md` - Add UX quality rubric

**Code Pattern/API:** ## UX Quality Rubric\n- Responsiveness: loads < 2s, interactions < 100ms\n- Accessibility: keyboard nav, focus visible\n- Consistency: matches design system\n- Errors: helpful, actionable messages

**Verification:** Rubric has measurable criteria; covers core UX dimensions; severity levels for violations

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met

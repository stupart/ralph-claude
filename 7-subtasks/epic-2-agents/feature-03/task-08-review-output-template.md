# Subtasks: Define Review Output Template and Severity Classification

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Base Template with Verdict/Issues/Cascade

**Action:** Create the standard review output template with verdict field (PASS/ITERATE), issues list with severity classification, and cascade decision.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` - Standard review output template

**Code Pattern/API:** ## Review Output\n\n### Verdict: [PASS | ITERATE]\n\n### Issues Found\n| # | Severity | Description | Recommendation |\n|---|----------|-------------|----------------|\n| 1 | MAJOR    | ...         | ...            |\n\n### Cascade Decision\n- Target Layer: [L# or NONE]\n- Reason: ...

**Verification:** Template has all required fields; severity levels defined (MINOR/MAJOR/ESCALATE); cascade decision included

---

## Subtask 2: Add Scope Coverage Summary Section

**Action:** Add a scope coverage summary section to the output template showing traceability status and any identified gaps.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` - Add scope coverage section

**Code Pattern/API:** ### Scope Coverage Summary\n- Source Concepts: [count]\n- Fully Covered: [count]\n- Partially Covered: [count]\n- Gaps Identified: [count]\n\n#### Gap Details\n| Source Concept | Gap Type | Severity |\n|----------------|----------|----------|\n| ...            | ...      | ...      |

**Verification:** Summary provides quick overview; gap details are specific; integrates with traceability matrix

---

## Subtask 3: Add Severity Classification Guidelines

**Action:** Add guidelines for classifying issues as MINOR, MAJOR, or ESCALATE with examples for common issue types.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` - Add severity guidelines

**Code Pattern/API:** ## Severity Classification\n\n### MINOR (fix in current layer)\n- Typos, formatting issues\n- Missing edge case handling\n\n### MAJOR (iterate required)\n- Acceptance criteria not met\n- Significant functionality gaps\n\n### ESCALATE (cascade to earlier layer)\n- Scope gap from synthesis\n- Architectural issue

**Verification:** Guidelines are clear with examples; distinguish iterate vs escalate; actionable for Judge

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met

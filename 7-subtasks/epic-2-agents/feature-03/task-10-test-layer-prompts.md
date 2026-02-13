# Subtasks: Test All Layer-Specific Prompts

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Test Cases for L3-L7 Prompts

**Action:** Create test cases for planning layer prompts (L3 synthesis, L4 epics, L5 features, L6 tasks, L7 subtasks) with passing and failing examples.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/judge-L3-test.md` - L3 Synthesis Review test cases
- CREATE: `/Users/tylerstupart/ralph-claude/tests/judge-L4-test.md` - L4 Epic Review test cases
- CREATE: `/Users/tylerstupart/ralph-claude/tests/judge-L5-L7-test.md` - L5-L7 Planning Review test cases

**Code Pattern/API:** ## Test Case Structure\n\n### Test 1: [Scenario]\n**Input:** [Sample artifacts]\n**Expected Verdict:** [PASS/ITERATE]\n**Expected Issues:** [List or none]\n**Rationale:** [Why this is the expected outcome]

**Verification:** Each layer has at least 2 test cases (pass and fail); scope coverage gaps tested; expected outputs documented

---

## Subtask 2: Create Test Cases for L9-L11 Prompts and Scope Coverage

**Action:** Create test cases for build/ship layer prompts (L9 feature review, L10 epic integration, L11 final review) and scope coverage protocol.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/judge-L9-L11-test.md` - L9-L11 Review test cases
- CREATE: `/Users/tylerstupart/ralph-claude/tests/scope-coverage-test.md` - Scope coverage protocol test cases

**Code Pattern/API:** ## L9 Test Cases\n- Feature that passes all acceptance criteria\n- Feature with UX issues\n- Feature with missing functionality\n\n## Scope Coverage Test Cases\n- Complete traceability (PASS)\n- Missing JTBD coverage (ESCALATE)\n- Partial pattern coverage (ITERATE)

**Verification:** L9-L11 tests cover acceptance criteria, integration, ship-worthiness; scope coverage tests include gap scenarios

---

## Subtask 3: Create Graduated Rigor Test Cases

**Action:** Create test cases verifying graduated rigor behavior differs correctly across iteration 1, 2, and 3+.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/graduated-rigor-test.md` - Graduated rigor test cases

**Code Pattern/API:** ## Graduated Rigor Tests\n\n### Iteration 1 Test\n- Same artifact, iteration 1: comprehensive review\n\n### Iteration 2 Test\n- Same artifact + previous issues, iteration 2: focus on fixes\n\n### Iteration 3+ Test\n- Same artifact + minor new issue, iteration 3: ignore new minor

**Verification:** Test cases verify different behavior per iteration; iteration 3+ convergence behavior tested; new minor issues correctly ignored

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met

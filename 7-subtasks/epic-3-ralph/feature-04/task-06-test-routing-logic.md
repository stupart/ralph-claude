# Subtasks: Test Routing Logic with Simulated Reviews

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Routing Test Procedure

**Action:** Create test procedure document with test cases for each verdict type: PASS, ITERATE with MINOR/MAJOR/ESCALATE, and max retry scenarios.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/routing-test.md` - Routing logic test procedure

**Code Pattern/API:** Test: PASS at L9 -> Expected: advance to L10; MINOR at L9 -> Expected: stay L9, route to L8

**Verification:** Tests cover all verdict types; tests verify correct target layers; tests verify iteration counting

---

## Subtask 2: Add Edge Case and Integration Tests

**Action:** Add edge case tests: max retry exceeded, cascading from different layers, compound issues (multiple severities), and full cycle integration.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/tests/routing-test.md` - Add edge case tests

**Code Pattern/API:** Edge: 3rd MINOR at L9 -> Expected: human notification; ESCALATE at L10 -> Expected: cascade to L4

**Verification:** Edge cases documented with expected behavior; integration test covers full review cycle; all scenarios testable

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

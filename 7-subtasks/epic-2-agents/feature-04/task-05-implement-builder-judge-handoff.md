# Subtasks: Implement Builder-Judge Handoff (Build Review Cycle)

**Parent Feature:** Agent Handoff Protocol
**Parent Epic:** Agent Specialization

---

## Subtask 1: Implement Builder-to-Judge Serialization

**Action:** Create function to serialize Builder output for Judge review: implementation diff, test results, files modified, original spec for reference.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/handoff/builder-judge.js` - Builder-Judge handoff functions

**Code Pattern/API:** function serializeBuilderToJudge(diff, testResults, spec) { return { type: 'buildReview', diff, tests: testResults, ... }; }

**Verification:** Builder-to-Judge includes diff and test output; references original spec; structured for Judge review

---

## Subtask 2: Implement Judge-to-Builder Serialization

**Action:** Add function to serialize Judge feedback for Builder iteration: specific issues to fix, code locations, expected behavior changes.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/handoff/builder-judge.js` - Add Judge-to-Builder function

**Code Pattern/API:** function serializeJudgeToBuilder(reviewOutput) { return { type: 'buildIteration', fixes: reviewOutput.issues, ... }; }

**Verification:** Judge-to-Builder includes specific actionable fixes; references file/line where possible; matches schema

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

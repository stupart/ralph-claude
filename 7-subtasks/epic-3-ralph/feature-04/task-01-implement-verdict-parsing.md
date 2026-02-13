# Subtasks: Implement Verdict Parsing

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Verdict Parser Module

**Action:** Create verdict-parser.js with parseVerdict(reviewOutput) function that extracts the verdict (PASS/ITERATE) from Judge review output using the standard format.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/routing/verdict-parser.js` - Verdict parsing functions

**Code Pattern/API:** function parseVerdict(output) { const match = output.match(/## Verdict: (PASS|ITERATE)/); return match ? match[1] : null; }

**Verification:** Parser extracts PASS correctly; extracts ITERATE correctly; returns null for malformed output

---

## Subtask 2: Add Severity Extraction

**Action:** Enhance parser to extract severity classification (MINOR/MAJOR/ESCALATE) from issues list when verdict is ITERATE.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/verdict-parser.js` - Add severity extraction

**Code Pattern/API:** function extractSeverity(output) { const issues = parseIssues(output); return getHighestSeverity(issues); } // Returns MINOR|MAJOR|ESCALATE

**Verification:** Extracts severity from issues; handles multiple severities (returns highest); handles no issues case

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

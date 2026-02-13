# Subtasks: Implement Required Field Validation

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Field Validator Module

**Action:** Create field-validator.js with functions to validate common required fields: non-empty description, acceptance criteria present, dependencies listed.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/field-validator.js` - Field validation functions

**Code Pattern/API:** function validateDescription(content) { const desc = extractSection(content, 'description'); return desc.trim().length > 0 ? pass() : fail('Empty description'); }

**Verification:** Empty description flagged; missing acceptance criteria flagged; issues include specific file and field name

---

## Subtask 2: Combine Field Validators into Full Artifact Validation

**Action:** Create validateArtifact(filePath, artifactType) function that runs all relevant field validators and aggregates results.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/field-validator.js` - Add aggregate validator

**Code Pattern/API:** function validateArtifact(file, type) { const results = [validateDescription(file), validateAcceptance(file), ...]; return aggregateResults(results); }

**Verification:** All relevant validators run; results are aggregated; full artifact validation returns comprehensive result

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

# Subtasks: Design ValidationResult Schema

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Validation Result Schema

**Action:** Create JSON Schema for validation results including pass/fail status, errors array (blocking), warnings array (non-blocking), with file and description for each issue.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/validation-result-schema.json` - Validation result schema

**Code Pattern/API:** { "passed": boolean, "errors": [{ "file": string, "description": string, "severity": "error" }], "warnings": [...] }

**Verification:** Schema includes pass/fail; errors array with file and description; warnings array; severity field exists

---

## Subtask 2: Document Validation Result Usage

**Action:** Add documentation comments to schema explaining when to use errors vs warnings, and how validation results feed into state machine decisions.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/schemas/validation-result-schema.json` - Add documentation

**Code Pattern/API:** "description": "Errors block progression; warnings are logged but don't block"

**Verification:** Schema has descriptions for all fields; explains error vs warning distinction; usage in state machine documented

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

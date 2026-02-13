# Tasks: Output Validation and Minimum Enforcement

## Task 1: Design ValidationResult Schema

**What it accomplishes:** Creates the schema for validation results including: pass/fail status, errors (blocking), warnings (non-blocking), specific details for each issue (file, line, what's wrong).

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/schemas/validation-result-schema.json` (create)

**Dependencies:** None

**Verification:** Schema includes pass/fail, errors array, warnings array; each issue has file, description, and severity.

---

## Task 2: Implement Count Validation for Each Hierarchy Level

**What it accomplishes:** Creates validation functions for each level: validateEpics() (3+ at L4), validateFeatures() (3+ per epic at L5), validateTasks() (3+ per feature at L6), validateSubtasks() (2+ per task at L7).

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` (create)

**Dependencies:** Task 1 (need result schema)

**Verification:** Validator correctly counts files; 2 epics returns failure; 4 epics returns success; partial completion is reported accurately.

---

## Task 3: Implement Template Compliance Checking

**What it accomplishes:** Creates validation that verifies artifacts follow required templates: all required sections present, required fields populated, format matches expected structure.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` (create)

**Dependencies:** Task 1 (need result schema)

**Verification:** Missing required section flagged as error; empty required field flagged; optional sections don't cause failures.

---

## Task 4: Implement Required Field Validation

**What it accomplishes:** Creates validation for common required fields: non-empty description, acceptance criteria present in specs, dependencies listed where required.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/field-validator.js` (create)

**Dependencies:** Tasks 2-3 (builds on other validators)

**Verification:** Empty description flagged; missing acceptance criteria flagged; issues include specific file and field name.

---

## Task 5: Integrate Tier-Based Minimum Adjustment

**What it accomplishes:** Connects validation to project tier (from Epic 1 Feature 05), adjusting minimum requirements: Micro tier has lower minimums, Large tier higher.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/tier-adjuster.js` (create)
- `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` (modify to use tier)

**Dependencies:** Tasks 2, Epic 1 Feature 05 (tier presets)

**Verification:** Micro tier requires only 1 epic; Small requires 3; Large requires 5; validation respects tier setting.

---

## Task 6: Integrate Validation with State Machine

**What it accomplishes:** Connects validator to state machine transitions, blocking advancement when validation fails and allowing advancement when it passes.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` (modify to call validator before transition)

**Dependencies:** Tasks 1-5, Epic 3 Feature 01 (state machine)

**Verification:** Attempting advance() with incomplete work fails; validation errors reported; advance() succeeds after requirements met.

---

## Task 7: Implement Planner Artifact Template Enforcement

**What it accomplishes:** Creates validation that Planner outputs match expected templates for each layer (L1-L7, L12), ensuring all required sections are present and properly formatted before advancement.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/planner-template-validator.js` (create)
- `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/` (create directory with schema per layer)

**Dependencies:** Task 3 (template compliance checking), Epic 2 Feature 01 (Planner output format)

**Verification:** Validator checks L4 epic template has Overview, User Value, Requirements sections; L7 subtask template has Action, Files, Verification sections; missing sections flagged with specific error; N/A sections require justification.

---

## Task 8: Implement N/A Section Justification Validation

**What it accomplishes:** Adds validation that any section marked as "N/A" or "Not Applicable" in artifacts must include a justification explaining why, preventing lazy or incomplete documentation.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/validation/na-section-validator.js` (create)
- `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` (modify to integrate N/A checking)

**Dependencies:** Task 7 (template enforcement)

**Verification:** "N/A" without justification flagged as error; "N/A - {reason}" passes validation; empty sections are distinguished from N/A sections; works across all artifact types.

# Subtasks: Implement Planner Artifact Template Enforcement

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration Engine

---

## Subtask 1: Define Planner Output Schema Directory Structure

**Action:** Create the directory structure and base schema for Planner output validation at each layer.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/README.md` - Directory overview
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/schema-format.md` - Schema definition format

**Schema Format:**
```yaml
layer: L4
artifact_type: epic
required_sections:
  - name: "Overview"
    min_length: 50
    allows_na: false
  - name: "User Value"
    min_length: 30
    allows_na: false
  - name: "Requirements"
    min_length: 100
    allows_na: false
    must_be_list: true
    min_items: 3
optional_sections:
  - name: "Technical Notes"
    allows_na: true
```

**Verification:** Directory exists; schema format is documented; allows_na field is included.

---

## Subtask 2: Create L4 Epic Output Schema

**Action:** Define the required template structure for epic artifacts at L4.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/l4-epic-schema.yaml` - Epic schema

**Required Sections:**
- Overview (no N/A)
- User Value (no N/A)
- Requirements (list, min 3 items, no N/A)
- Technical Approach (no N/A)
- Acceptance Criteria (list, no N/A)
- Planned Tasks (list, min 3 items, no N/A)
- Edge Cases (allows N/A with justification)
- Dependencies (allows N/A with justification)

**Verification:** Schema enforces all required sections; Edge Cases and Dependencies allow justified N/A.

---

## Subtask 3: Create L5-L7 Output Schemas

**Action:** Define template schemas for feature (L5), task (L6), and subtask (L7) artifacts.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/l5-feature-schema.yaml`
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/l6-task-schema.yaml`
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/l7-subtask-schema.yaml`

**L7 Subtask Required Sections:**
- Action (single sentence, no N/A)
- Files (list with CREATE/MODIFY, no N/A)
- Code Pattern/API (allows N/A for non-code tasks)
- Verification (no N/A)

**Verification:** Each layer has schema; subtask schema is most prescriptive; Code Pattern allows N/A.

---

## Subtask 4: Implement Planner Template Validator

**Action:** Create the validation module that checks Planner outputs against layer-specific schemas.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/planner-template-validator.js` - Validator implementation

**API:**
```javascript
class PlannerTemplateValidator {
  // Load schema for layer
  loadSchema(layer) { }

  // Validate artifact against schema
  validate(artifactPath, layer) {
    // Returns: { valid: boolean, errors: [], warnings: [] }
  }

  // Check specific section exists and meets requirements
  validateSection(content, sectionSchema) { }

  // Check N/A has justification if allowed
  validateNaUsage(sectionContent, sectionSchema) { }
}
```

**Verification:** Validator loads correct schema per layer; returns specific errors for missing sections; validates N/A usage.

---

## Subtask 5: Integrate Template Validation with Output Validation

**Action:** Connect Planner template validation to the main validation flow.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` - Add Planner-specific validation
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` - Call template validator after count check

**Integration:**
- After count validation passes, run template validation on each artifact
- Aggregate errors from both validators
- Template errors are blocking (must fix before advancing)

**Verification:** Template validation runs after count validation; errors from both are combined; blocking on template failures.

---

## Subtask 6: Create L12 Retrospective Schema

**Action:** Define the template schema for L12 retrospective output.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/planner-output-schemas/l12-retrospective-schema.yaml`

**Required Sections:**
- Project Summary (no N/A)
- What Went Well (list, no N/A)
- What Could Improve (list, no N/A)
- Iteration Analysis (no N/A)
- Methodology Improvements (allows N/A if no improvements identified)
- Lessons Learned (no N/A)

**Verification:** Schema covers retrospective sections; Methodology Improvements allows justified N/A.

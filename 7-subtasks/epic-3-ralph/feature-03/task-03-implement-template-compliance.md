# Subtasks: Implement Template Compliance Checking

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Template Validator Module

**Action:** Create template-validator.js with validateTemplate(filePath, templateType) function that checks if artifact has all required sections and correct structure.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` - Template validation functions

**Code Pattern/API:** function validateTemplate(file, type) { const content = fs.readFileSync(file); const required = TEMPLATE_SECTIONS[type]; return checkSections(content, required); }

**Verification:** Missing required section flagged as error; optional sections don't cause failures; error identifies which section missing

---

## Subtask 2: Define Required Sections for Each Template Type

**Action:** Create configuration defining required sections for each artifact type (epic, feature, task, subtask) based on template specifications.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` - Add section configurations

**Code Pattern/API:** const TEMPLATE_SECTIONS = { epic: ['description', 'features', 'acceptance'], task: ['what', 'time', 'files', 'verification'], ... };

**Verification:** Each artifact type has required sections defined; sections match template specs; validation uses correct requirements

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

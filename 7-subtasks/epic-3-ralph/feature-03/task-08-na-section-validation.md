# Subtasks: Implement N/A Section Justification Validation

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration Engine

---

## Subtask 1: Define N/A Detection Patterns

**Action:** Create regex patterns and rules for detecting N/A sections in artifacts.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/na-section-validator.js` - N/A detection and validation

**Detection Patterns:**
```javascript
const NA_PATTERNS = [
  /^N\/A$/i,
  /^N\/A\s*[-:]/i,           // N/A - reason or N/A: reason
  /^Not\s+Applicable$/i,
  /^Not\s+Applicable\s*[-:]/i,
  /^None$/i,
  /^-$/,                      // Single dash
  /^\s*$/                     // Empty (distinct from N/A)
];

const JUSTIFIED_NA_PATTERN = /^(N\/A|Not Applicable)\s*[-:]\s*.{10,}/i;
```

**Verification:** Patterns detect common N/A variants; justified pattern requires explanation.

---

## Subtask 2: Implement N/A Justification Requirement

**Action:** Create validation logic that ensures N/A sections include justification.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/na-section-validator.js` - Add justification check

**Validation Rules:**
1. Detect if section content matches N/A pattern
2. Check if section allows N/A (from schema)
3. If N/A not allowed: error "Section {name} cannot be N/A"
4. If N/A allowed but no justification: error "Section {name} marked N/A requires justification"
5. Justification must be at least 10 characters

**API:**
```javascript
validateNaSection(sectionName, content, allowsNa) {
  if (!isNaContent(content)) return { valid: true };
  if (!allowsNa) return { valid: false, error: `Section ${sectionName} cannot be N/A` };
  if (!hasJustification(content)) return { valid: false, error: `N/A in ${sectionName} requires justification` };
  return { valid: true };
}
```

**Verification:** Unjustified N/A in allowed section returns error; N/A in disallowed section returns error; justified N/A passes.

---

## Subtask 3: Distinguish Empty from N/A

**Action:** Ensure validation distinguishes between empty sections (missing content) and explicit N/A sections.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/na-section-validator.js` - Add empty detection

**Distinction:**
- Empty section: No content, whitespace only
  - Error: "Section {name} is empty - provide content or justified N/A"
- N/A section: Explicit N/A marker
  - Check justification requirement

**Verification:** Empty section gets different error than unjustified N/A; both are flagged.

---

## Subtask 4: Integrate N/A Validation with Template Validator

**Action:** Connect N/A validation to the template validation flow.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/template-validator.js` - Call N/A validator for each section

**Integration Point:**
```javascript
// In template-validator.js validateSection()
const naResult = naSectionValidator.validateNaSection(
  section.name,
  sectionContent,
  sectionSchema.allows_na
);
if (!naResult.valid) {
  errors.push(naResult.error);
}
```

**Verification:** N/A validation runs for every section; errors are aggregated with other template errors.

---

## Subtask 5: Create N/A Validation Test Cases

**Action:** Create test cases covering all N/A validation scenarios.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/na-validation-test.md` - Test cases

**Test Cases:**
1. Required section with N/A (no justification) - FAIL
2. Required section with N/A + justification - FAIL (required = no N/A)
3. Optional section with N/A (no justification) - FAIL
4. Optional section with N/A + justification - PASS
5. Optional section with full content - PASS
6. Required section with empty content - FAIL (different error)
7. Section with "None" (N/A variant) - follows N/A rules
8. Section with "-" only - follows N/A rules

**Verification:** Test document covers all scenarios; expected results are documented.

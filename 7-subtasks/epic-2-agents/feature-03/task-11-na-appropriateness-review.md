# Subtasks: Implement N/A Appropriateness Review

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent System

---

## Subtask 1: Define N/A Appropriateness Criteria

**Action:** Create the protocol document defining when N/A is acceptable vs inappropriate.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/protocols/na-review-protocol.md` - N/A review criteria

**Appropriateness Criteria:**
```markdown
# N/A Appropriateness Review Protocol

## When N/A is Acceptable

1. **Genuinely Not Applicable**
   - Edge Cases section when feature is straightforward
   - Dependencies section for standalone features
   - Technical Notes for non-technical artifacts

2. **Requirements for Acceptable N/A**
   - Must include justification (10+ characters)
   - Justification must explain WHY not applicable
   - Cannot be lazy shortcut for "I didn't think about this"

## When N/A is NOT Acceptable

1. **Core Sections**
   - Overview, User Value, Requirements: NEVER N/A
   - Acceptance Criteria: NEVER N/A
   - Verification: NEVER N/A

2. **Lazy N/A Indicators**
   - Very short justification: "N/A - none"
   - Vague justification: "N/A - not needed"
   - Pattern of N/A across multiple artifacts

3. **Suspicious Patterns**
   - Same section N/A in 3+ artifacts at same layer
   - N/A in section that clearly has content in similar artifacts

## Severity Classification

- **MINOR**: N/A in optional section with weak justification
- **MAJOR**: N/A in important section, or pattern of lazy N/A
- **ESCALATE**: N/A in core section, or N/A hides scope gap
```

**Verification:** Protocol distinguishes acceptable from unacceptable N/A; includes severity levels.

---

## Subtask 2: Add N/A Review Section to Judge Base Prompt

**Action:** Incorporate N/A review criteria into the base Judge prompt.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` - Add N/A review section

**Section Addition:**
```markdown
## N/A Section Review

When reviewing artifacts, pay special attention to sections marked N/A or "Not Applicable":

1. **Check if N/A is allowed for this section**
   - Core sections (Overview, Requirements, Acceptance Criteria) cannot be N/A
   - Optional sections may allow N/A with justification

2. **Evaluate the justification**
   - Is there a justification? (Just "N/A" is never acceptable)
   - Is the justification meaningful? (10+ characters, explains why)
   - Does the justification make sense for this artifact?

3. **Look for patterns**
   - Same section N/A across multiple artifacts = potential scope gap
   - Many N/A sections in one artifact = lazy documentation

4. **Classify issues**
   - MINOR: Weak justification on optional section
   - MAJOR: Pattern of N/A or missing justification
   - ESCALATE: N/A on core section or hides scope gap

See: templates/protocols/na-review-protocol.md for full criteria.
```

**Verification:** Base prompt includes N/A review section; references full protocol.

---

## Subtask 3: Add N/A Checks to Layer-Specific Prompts

**Action:** Add layer-specific N/A review criteria to each Judge prompt.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` - Epic-specific N/A checks
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-features.md` - Feature-specific N/A checks
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L6-tasks.md` - Task-specific N/A checks
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L7-subtasks.md` - Subtask-specific N/A checks

**Layer-Specific Additions:**

L4 (Epics):
- Edge Cases: N/A acceptable if project is simple, but rare
- Dependencies: N/A acceptable for standalone epics

L5 (Features):
- Edge Cases: N/A acceptable for straightforward features
- Dependencies: N/A rarely acceptable at feature level

L6 (Tasks):
- Dependencies: N/A more common, acceptable with justification
- Technical Approach: N/A NOT acceptable

L7 (Subtasks):
- Code Pattern: N/A acceptable for non-code tasks only
- All other sections: N/A NOT acceptable

**Verification:** Each layer prompt has specific N/A guidance; guidance aligns with schema.

---

## Subtask 4: Integrate N/A Review with Scope Coverage

**Action:** Connect N/A review to scope coverage checking - N/A may hide dropped scope.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/protocols/scope-coverage-protocol.md` - Add N/A cross-check

**Integration:**
```markdown
## N/A and Scope Coverage Cross-Check

When performing scope coverage review:

1. Note all N/A sections across current layer artifacts
2. Cross-reference with synthesis items
3. Flag if:
   - Synthesis item appears to map to N/A section
   - Pattern of N/A in section that should cover synthesis item
   - N/A justification contradicts synthesis content

Example:
- Synthesis mentions "offline support" requirement
- Epic Edge Cases section is "N/A - straightforward feature"
- This is a scope gap hidden by lazy N/A
```

**Verification:** Scope coverage protocol includes N/A cross-check; example illustrates detection.

---

## Subtask 5: Create N/A Review Output Format

**Action:** Define how N/A issues should appear in Judge review output.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` - Add N/A issues section

**Output Format:**
```markdown
## N/A Section Issues

### Issue: Unjustified N/A in Edge Cases
**File:** 4-epics/epic-01-core-features.md
**Section:** Edge Cases
**Current Content:** "N/A"
**Severity:** MAJOR
**Problem:** No justification provided; edge cases likely exist for this epic
**Suggested Action:** Enumerate at least 3 edge cases or provide detailed justification

### Issue: Lazy N/A Pattern Detected
**Pattern:** Dependencies section N/A in 4 of 5 epics
**Severity:** MAJOR
**Problem:** Unlikely that 80% of epics have no dependencies
**Suggested Action:** Review each epic for genuine dependencies
```

**Verification:** Output format shows file, section, severity, and suggested action.

---

## Subtask 6: Add N/A Review Test Cases

**Action:** Create test cases for Judge N/A review behavior.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/judge-na-review-test.md` - N/A review tests

**Test Cases:**
1. Artifact with N/A in core section (Requirements)
   - Expected: ESCALATE severity issue

2. Artifact with N/A in optional section, no justification
   - Expected: MAJOR severity issue

3. Artifact with N/A in optional section, valid justification
   - Expected: No issue

4. Pattern: Same section N/A in 3+ artifacts
   - Expected: MAJOR severity, pattern flagged

5. N/A that appears to hide scope gap (cross-ref synthesis)
   - Expected: ESCALATE, scope gap flagged

6. Subtask with "Code Pattern: N/A" for documentation task
   - Expected: No issue (valid N/A)

**Verification:** Test cases cover all N/A review scenarios; expected severities documented.

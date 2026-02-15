# Judge L9: Feature Review

## Layer Context

You are reviewing a **completed feature** at L9. This is a BUILD review - you are verifying that the implementation matches the specification and provides a good user experience.

## What You're Reviewing

- The implemented feature code
- The feature specification from `/5-features/{epic}/feature-*.md`
- The task and subtask completions
- The actual user experience via /chrome testing

## Review Protocol

### Step 1: Load Feature Specification
```
1. Read the feature spec: /5-features/{epic}/{feature}.md
2. Note all acceptance criteria
3. Note all edge cases mentioned
4. Identify UX requirements
```

### Step 2: Code Review

Examine the implementation:

**Completeness:**
- [ ] All specified functionality is present
- [ ] No TODO comments left unresolved
- [ ] All imports and dependencies correct
- [ ] No dead code or unused variables

**Quality:**
- [ ] Error handling is present
- [ ] Edge cases are handled
- [ ] Code is reasonably readable
- [ ] No obvious security issues

**Integration:**
- [ ] Integrates with existing code correctly
- [ ] No regressions in related functionality
- [ ] Data flows match expected patterns

### Step 3: Test Review

Run and verify tests:
```bash
# Run test suite relevant to this feature
npm test -- --grep "{feature_name}"
# or equivalent for the project
```

- [ ] Tests exist for the feature
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] All tests pass

### Step 4: UX Review (Browser or Fallback)

If `/chrome` or Playwright MCP is available, use browser automation to test the actual experience. **If browser tools are unavailable or unresponsive, do NOT block on this step.** Fall back to the alternative verification chain below.

**Verification priority chain:**
1. **Browser automation** (`/chrome` or Playwright MCP) - preferred for visual/UX verification
2. **Automated tests** (`npm test`, `jest`, `pytest`, etc.) - verify behavior programmatically
3. **curl / API testing** - verify endpoints respond correctly
4. **Code review** - verify logic by reading the implementation

If using browser automation (option 1):
```
1. Navigate to the feature in the application
2. Test each acceptance criterion from the spec
3. Test edge cases (empty states, errors, etc.)
4. Assess general UX quality
```

**UX Checklist (when browser is available):**
- [ ] Feature is discoverable/accessible
- [ ] UI matches design intent (if specified)
- [ ] Loading states are handled
- [ ] Error messages are helpful
- [ ] Success states are clear
- [ ] No broken layouts or visual glitches
- [ ] Interactions feel responsive

**If browser is NOT available**, note "UX review skipped: browser tools unavailable" in your review and verify all acceptance criteria through tests and code inspection instead. Do not issue ITERATE solely because browser testing was unavailable.

### Step 5: Acceptance Criteria Verification

Go through each acceptance criterion from the spec:

| Criterion | Met? | Evidence |
|-----------|------|----------|
| {AC1}     | Yes/No | {what you observed} |
| {AC2}     | Yes/No | {what you observed} |

**ALL acceptance criteria must be met for PASS.**

## Severity Guide for L9

| Issue | Severity | Cascade To |
|-------|----------|-----------|
| Acceptance criterion not met | MAJOR | L7 (re-spec subtasks) |
| Bug in implementation | MINOR | L8 (fix code) |
| Missing error handling | MINOR | L8 |
| Poor UX but functional | MINOR | L8 |
| Wrong feature implemented | ESCALATE | L6 (re-spec tasks) |
| Integration issues | MAJOR | L7 |
| Tests failing | MINOR | L8 |
| No tests at all | MAJOR | L7 |

## Issue Documentation

For each issue, include:

```markdown
### Issue: {Title}

**Severity:** MINOR / MAJOR / ESCALATE
**Location:** {file:line OR UI location}
**Acceptance Criterion Violated:** {which one, if applicable}

**Description:**
{What's wrong}

**Evidence:**
{Screenshot description, test output, or specific observation}

**Recommendation:**
{How to fix it}
```

### Step 6: Documentation Check

Verify that documentation matches the implementation:
- [ ] JSDoc or inline comments exist for public functions
- [ ] Any user-facing docs referenced in the spec are present and current
- [ ] No stale references to old APIs, removed functions, or renamed files
- [ ] If a `naming-conventions.md` exists in `/3-synthesis/`, verify the feature's code follows those conventions

This is not about requiring extensive docs. It is about catching stale docs (e.g., docs that describe V2 when V3 shipped) and missing docs that the spec explicitly requires.

## Pass Criteria

PASS if:
- [ ] All acceptance criteria are met
- [ ] Tests exist and pass
- [ ] UX is acceptable (functional and usable)
- [ ] No MAJOR or ESCALATE issues remain
- [ ] Any MINOR issues are documented but non-blocking
- [ ] No stale documentation that contradicts the implementation

ITERATE if:
- Any acceptance criterion is not met
- Tests are failing
- There are blocking UX issues
- MAJOR issues exist

## Notes on Graduated Rigor

**Iteration 1:** Be thorough. Test every acceptance criterion. Document all UX issues.

**Iteration 2:** Focus on verifying previous issues are fixed. Check for regressions from fixes.

**Iteration 3+:** Focus only on acceptance criteria. Accept "good enough" UX. Don't block on polish.

## Review Scope Notes

Documents in `3-synthesis/` are pre-build planning artifacts. Staleness relative to the as-built code is expected and should NOT be flagged as an issue.

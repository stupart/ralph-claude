# Judge L10-L11: Integration and Final Review

## L10: Epic Integration Review

### Layer Context
You are reviewing the **complete epic** - all features should be implemented and working together.

### What You're Reviewing
- All features within the epic
- Integration between features
- Epic-level acceptance (does the epic accomplish its goal?)

### Review Protocol

#### Step 1: Feature Completeness
- [ ] All features in the epic are at PASS from L9
- [ ] No pending L9 reviews

#### Step 2: Integration Testing

Test cross-feature interactions. If `/chrome` or Playwright MCP is available, use browser automation. **If browser tools are unavailable, do NOT block.** Fall back to tests, curl, or code review.

```
1. Identify features that should work together
2. Create integration test scenarios
3. Execute via browser automation, tests, or code review (in priority order)
4. Document any integration issues
```

**Integration Checklist:**
- [ ] Data flows correctly between features
- [ ] No conflicting behaviors
- [ ] State is consistent across features
- [ ] Navigation between features works
- [ ] Error handling is consistent

#### Step 3: Epic-Level Assessment

Does this epic accomplish what it set out to do?
- [ ] Epic description is fulfilled
- [ ] Related JTBD are satisfied
- [ ] Quality is consistent across features

### Severity Guide for L10

| Issue | Severity | Cascade |
|-------|----------|---------|
| Feature regression | MINOR | L8 |
| Integration bug | MINOR | L8 |
| Features don't work together | MAJOR | L6 (re-spec tasks) |
| Epic goal not met | ESCALATE | L5 (re-spec features) |

---

## L11: Final Review

### Layer Context
This is the **final gate before shipping**. You are reviewing the entire project for ship-worthiness.

### What You're Reviewing
- All completed epics
- Full end-to-end user journeys
- Overall quality and polish

### Review Protocol

#### Step 1: Epic Completeness
- [ ] All epics have passed L10
- [ ] No pending reviews at any level

#### Step 2: Full Journey Testing

Walk through every user journey from synthesis. Use `/chrome` or Playwright MCP if available. **If browser tools are unavailable, do NOT block.** Verify journeys via tests, curl, or code review instead.

```
For each journey in /3-synthesis/journeys.md:
1. Execute the journey end-to-end (browser, tests, or code review)
2. Note any friction or issues
3. Test error recovery paths
4. Assess overall experience
```

#### Step 3: Documentation Audit

This is a REQUIRED step. The meta-test demonstrated that documentation falls out of sync with implementation and is never caught without an explicit audit.

**Check the following:**
- [ ] All user-facing docs match the shipped implementation (not a prior version)
- [ ] No docs reference removed, renamed, or superseded concepts
- [ ] If `/3-synthesis/naming-conventions.md` exists, verify all code follows its conventions
- [ ] README or quickstart exists and is accurate (or flag its absence as MINOR)
- [ ] Architecture docs match the final system (not an earlier design iteration)

**Common documentation debt to catch:**
- Docs describing V(N-1) when V(N) shipped
- Architecture docs with wrong layer counts, folder names, or agent names
- Template references to files that no longer exist
- Command docs referencing old CLI flags or APIs

| Issue | Severity |
|-------|----------|
| Stale doc that contradicts shipped code | MINOR |
| Missing quickstart / no entry point for new users | MINOR |
| Architecture doc describing a fundamentally different system | MAJOR |

#### Step 4: Quality Assessment

**Ask yourself: "Would I be proud to ship this?"**

Checklist:
- [ ] Core functionality works reliably
- [ ] Error states are handled gracefully
- [ ] UX is intuitive (no user manual needed)
- [ ] Performance is acceptable
- [ ] No obvious security issues
- [ ] Design is consistent

#### Step 5: Scope Verification

Final check against original synthesis:
- [ ] All JTBD are addressed
- [ ] All journeys are supported
- [ ] Architecture decisions are implemented
- [ ] Constraints are respected

### Severity Guide for L11

| Issue | Severity | Cascade |
|-------|----------|---------|
| Minor polish issue | MINOR | L8 |
| Feature doesn't work in context | MAJOR | L5 (rethink feature) |
| JTBD not satisfied | ESCALATE | L4 (rethink epic) |
| Fundamental UX problem | MAJOR | L5 |
| Security concern | ESCALATE | Depends on scope |

### Pass Criteria for L11

**Be honest. This is the last gate.**

PASS if:
- [ ] All journeys can be completed
- [ ] Quality is "shippable" (not perfect, but good)
- [ ] No blocking issues remain
- [ ] You would be comfortable with users seeing this

ITERATE if:
- Any journey is broken
- There are blocking quality issues
- Critical scope is missing

### Ship Decision

If PASS at L11:
```
Verdict: PASS - READY TO SHIP

This project is ready for deployment/delivery.

Summary: {what was built}
Quality: {honest assessment}
Known Limitations: {anything acceptable but not ideal}
```

If ITERATE at L11:
```
Verdict: ITERATE

This project is NOT ready to ship.

Blocking Issues: {list}
Cascade: Return to L{X}
Required Fixes: {specific items}
```

# Review Output Template

Use this template for all Judge agent reviews at any layer.

---

# Review: {Layer} - {Item Name}

**Date:** {YYYY-MM-DD}
**Reviewer:** Judge Agent
**Iteration:** {1, 2, or 3+}
**Review Type:** Plan | Build

---

## Verdict: PASS | ITERATE

---

## Summary

{1-2 sentence high-level assessment. Be direct.}

---

## Issues Found

{List all issues. Order by severity (ESCALATE > MAJOR > MINOR).}

### Issue 1: {Descriptive Title}

- **Severity:** MINOR | MAJOR | ESCALATE
- **Location:** {file path:line number OR section name OR UI location}
- **Category:** {Completeness | Quality | Integration | UX | Performance | Security}

**Description:**
{What's wrong. Be specific.}

**Evidence:**
{What you observed that proves this is an issue. Quote code, describe behavior, reference spec.}

**Impact:**
{Why this matters. What could go wrong if not fixed.}

**Recommendation:**
{Concrete suggestion for how to fix. Be actionable.}

---

### Issue 2: {Title}

{Repeat format for each issue}

---

## What's Working Well

{Don't skip this section. Acknowledge good work. 2-3 bullet points minimum.}

- {Positive observation 1}
- {Positive observation 2}
- {Positive observation 3}

---

## Scope Coverage Summary

{For plan reviews only. Include for L3-L7.}

| Category | Covered | Total | Percentage |
|----------|---------|-------|------------|
| JTBD | | | % |
| Journeys | | | % |
| Architecture | | | % |
| Constraints | | | % |

{Note any specific gaps}

---

## Cascade Decision

{If verdict is ITERATE, specify where work should return.}

**Based on issues found:**

| Issue Severity | Count | Cascade Target |
|---------------|-------|----------------|
| MINOR | {n} | L{current} (fix and retry) |
| MAJOR | {n} | L{target} ({reason}) |
| ESCALATE | {n} | L{target} ({reason}) |

**Primary cascade:** Return to **L{X}** because {reason}.

---

## Checklist for Next Iteration

{If ITERATE, provide specific items to address.}

- [ ] Fix Issue 1: {brief}
- [ ] Fix Issue 2: {brief}
- [ ] Address {specific concern}
- [ ] Verify {specific check}

---

## Reviewer Notes

{Any additional context, observations, or suggestions not tied to specific issues.}

---

# Severity Reference

| Severity | Criteria | Typical Cascade |
|----------|----------|-----------------|
| **MINOR** | Code-level fix; doesn't change spec | Same layer |
| **MAJOR** | Requires spec revision; approach adjustment | One layer back |
| **ESCALATE** | Fundamental problem; wrong approach | Two+ layers back |

# Issue Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Completeness** | Missing required elements | Missing field, below minimum count |
| **Quality** | Implementation problems | Bug, poor code quality, missing tests |
| **Integration** | Doesn't work with other parts | Breaks existing feature, wrong data format |
| **UX** | User experience issues | Confusing flow, missing feedback, poor accessibility |
| **Performance** | Speed/efficiency problems | Slow load, memory leak, inefficient query |
| **Security** | Safety concerns | Exposed data, missing validation, injection risk |

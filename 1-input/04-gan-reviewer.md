# GAN Reviewer System

The adversarial review component that ensures quality.

---

## Overview

The GAN (Generative Adversarial Network) reviewer is a **critic persona** that Ralph switches into at review checkpoints. It's prompted to be skeptical, thorough, and user-focused.

The name "GAN" is metaphorical - it's not a neural network, but captures the adversarial dynamic: generator produces, critic evaluates, generator improves.

---

## When Reviews Happen

| Trigger | Review Type | Scope |
|---------|-------------|-------|
| All specs in chunk implemented | Chunk Review | Single chunk |
| All chunks pass chunk review | Integration Review | Cross-chunk |
| Integration tests pass | Final Review | Entire project |

---

## Reviewer Persona

When entering review mode, Ralph adopts this persona:

```markdown
# GAN Reviewer Mode

You are now the CRITIC, not the builder.

## Your Mindset
- Assume there are bugs until proven otherwise
- "Works" is not good enough - it must work WELL
- Think like a frustrated user, not a proud developer
- Find the edge cases the builder missed
- Question every assumption

## What You Check
1. **Functionality:** Does it actually do what the spec says?
2. **UX Quality:** Is it pleasant to use? Or just functional?
3. **Edge Cases:** What happens with weird input?
4. **Error Handling:** Do errors fail gracefully?
5. **Performance:** Is it responsive? Any lag?
6. **Consistency:** Does it match the rest of the system?
7. **Accessibility:** Can different users use it?

## How You Test
- USE the feature via /chrome - don't just read code
- Try to break it
- Try unexpected inputs
- Try rapid actions
- Try on different screen sizes (if applicable)

## Your Output
Be specific. "It feels slow" is useless.
"The login button takes 3 seconds to respond after click" is useful.

## Your Standards
- PASS means you'd be comfortable shipping this
- FAIL means real users would have problems
- When in doubt, FAIL - better to iterate than ship broken
```

---

## Chunk Review Process

### Input
- Chunk `_index.md`
- All spec files in chunk
- Implemented code
- Test results

### Process

1. **Read specs** - Understand what was supposed to be built

2. **Review code** - Quick scan for obvious issues
   - Does structure match spec?
   - Any red flags?

3. **Functional testing** - Via /chrome
   - Go through each spec's acceptance criteria
   - Mark each as PASS/FAIL
   - Note any issues found

4. **UX assessment** - Subjective quality
   - Does it feel good?
   - Any friction points?
   - Consistent with rest of app?

5. **Edge case testing** - Try to break it
   - Empty inputs
   - Very long inputs
   - Special characters
   - Rapid repeated actions
   - Network issues (if applicable)

6. **Write review** - Document findings

### Output: _review.md

```markdown
# Chunk Review: {chunk-name}

**Reviewer:** GAN Critic
**Date:** {YYYY-MM-DD}
**Iteration:** {N} of 3
**Time Spent:** {minutes}

---

## Verdict: {PASS | FAIL}

---

## Spec Reviews

### spec-{name}.md
**Verdict:** PASS | FAIL

**Acceptance Criteria:**
- [x] Criterion 1
- [x] Criterion 2
- [ ] Criterion 3 - FAILED: {reason}

**Issues Found:**
{list or "None"}

**UX Notes:**
{observations}

---

### spec-{name}.md
...

---

## Overall Issues

### Issue 1: {Title}
**Severity:** MINOR | MAJOR
**Spec:** {which spec}
**Description:** {what's wrong}
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Observe: {problem}

**Expected:** {what should happen}
**Actual:** {what does happen}
**Recommendation:** {how to fix}

---

## What Worked Well
- {positive observation 1}
- {positive observation 2}

## Recommendations
{suggestions, even if PASS}

---

## Next Steps

{If PASS}
Chunk approved. Proceed to next chunk.

{If FAIL - MINOR issues}
Return to Layer 6. Fix the following:
- Issue 1: {brief}
- Issue 2: {brief}

{If FAIL - MAJOR issues}
Return to Layer 5. Revise specs:
- {spec} needs: {what}
- New spec needed for: {what}
```

---

## Severity Classification

### MINOR
- Bug that has a workaround
- UX issue that's annoying but not blocking
- Missing validation that rarely triggers
- Visual glitch

**Action:** Fix in Layer 6, re-review

### MAJOR
- Core functionality broken
- No workaround exists
- Security issue
- Data loss possible
- Spec was misunderstood

**Action:** Return to Layer 5, revise specs, re-implement

---

## Integration Review

Happens after all chunks pass individual review.

### Focus Areas
- Features work together correctly
- No conflicts between chunks
- Shared state handled properly
- Navigation flows work end-to-end
- Performance at scale

### Output
Same format as chunk review, but scope is cross-chunk interactions.

---

## Final Review

Full system review before project completion.

### Focus Areas
- Overall UX coherence
- Design consistency
- Performance
- Error handling across system
- Documentation completeness
- Would you ship this?

### Output
Same format, but may recommend:
- Minor polish (proceed to Layer 10)
- Chunk rework (return specific chunks to Layer 5)
- Architecture issues (return to Layer 3 or 4)

---

## Iteration Limits

- **Per chunk:** 3 iterations max
- **After 3 failures:**
  1. Document recurring issues
  2. Escalate to Layer 4 (re-outline)
  3. May need to split chunk or change approach

This prevents infinite loops while allowing reasonable iteration.

---

## Reviewer Independence

The reviewer should act as if they didn't build it:
- Don't remember implementation decisions
- Don't give benefit of doubt
- Judge only by observable behavior
- Pretend you're seeing it for the first time

---

## Review Checklist Template

Quick checklist for reviewer to ensure coverage:

```markdown
## Pre-Review Checklist
- [ ] Read all specs in chunk
- [ ] Understand acceptance criteria
- [ ] Identify testable behaviors

## Functional Testing
- [ ] Each acceptance criterion tested
- [ ] Happy path works
- [ ] Error paths work
- [ ] Edge cases tested

## UX Assessment
- [ ] Used via /chrome, not just code review
- [ ] Tried as a real user would
- [ ] Noted friction points
- [ ] Checked consistency

## Edge Cases
- [ ] Empty/null inputs
- [ ] Boundary values
- [ ] Invalid inputs
- [ ] Rapid interactions
- [ ] Concurrent usage (if applicable)

## Documentation
- [ ] Review written
- [ ] Issues clearly described
- [ ] Severity assigned
- [ ] Recommendations provided
```

---

## Conflict Resolution

If builder disagrees with reviewer:

1. **Builder can respond** in _review.md with counterargument
2. **Reviewer re-evaluates** with new information
3. **If still disagree:** Document both positions, human decides
4. **Default:** Reviewer wins (err on side of quality)

---

## Metrics to Track

For methodology improvement:
- Pass rate per chunk (first attempt)
- Average iterations to pass
- Common issue categories
- Time spent in review vs implementation
- Issues caught in chunk review vs final review

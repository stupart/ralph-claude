# Layer Specifications

Detailed specs for each layer's behavior, inputs, outputs, and done criteria.

---

## Layer 1: Input

### Purpose
Gather all raw material that will inform the project.

### Entry Criteria
- Project initiated
- User has ideas/requirements to share

### Process
1. Create `/1-input/` folder
2. Capture brain dumps (text, transcribed audio)
3. Gather research (web searches, docs, references)
4. Collect designs (screenshots, mockups, inspirations)
5. Note existing code/systems to analyze

### Artifacts
```
/1-input/
├── brain-dump-001.md       # User's raw thoughts
├── brain-dump-002.md       # Follow-up thoughts
├── research/
│   ├── competitor-analysis.md
│   └── tech-research.md
├── designs/
│   ├── inspiration-1.png
│   └── mockup-v1.png
└── existing-system-notes.md
```

### Done Criteria
- [ ] At least one substantial brain dump captured
- [ ] All referenced materials gathered
- [ ] No obvious gaps in input material

### Exit
Update `_status.md` → Layer 2

---

## Layer 2: Decomposition

### Purpose
Break down raw input into atomic, organized pieces.

### Entry Criteria
- Layer 1 complete
- Sufficient raw material to analyze

### Process
1. Read all input materials
2. Extract key quotes/statements
3. Identify patterns across inputs
4. Group related items (affinity mapping)
5. Note contradictions or tensions

### Artifacts
```
/2-decomposition/
├── quotes.md               # Key extracted statements
├── patterns.md             # Recurring themes
├── affinities.md           # Grouped related items
└── tensions.md             # Contradictions to resolve
```

### quotes.md Format
```markdown
# Extracted Quotes

## User Desires
> "I want it to work longer and write more code"
Source: brain-dump-001.md

> "Need clear visibility into the system"
Source: brain-dump-001.md

## Constraints
> "Should be simple and elegant"
Source: brain-dump-001.md

## Technical Notes
...
```

### Done Criteria
- [ ] All input materials processed
- [ ] Quotes extracted and categorized
- [ ] Patterns identified
- [ ] Affinities grouped
- [ ] Tensions noted

### Exit
Update `_status.md` → Layer 3

---

## Layer 3: Synthesis

### Purpose
Transform decomposed pieces into actionable understanding.

### Entry Criteria
- Layer 2 complete
- Patterns and affinities identified

### Process
1. Define Jobs to Be Done (what user is trying to accomplish)
2. Map customer/user journeys
3. Analyze current state (if existing system)
4. Make architecture decisions
5. Identify technical constraints

### Artifacts
```
/3-synthesis/
├── jtbd.md                 # Jobs to be done
├── journeys.md             # User journeys/flows
├── current-state.md        # Analysis of existing system
├── architecture.md         # Technical decisions
└── constraints.md          # Limitations and boundaries
```

### jtbd.md Format
```markdown
# Jobs to Be Done

## Primary Jobs

### Job 1: Get Ralph to work longer
**When:** User starts Ralph on a project
**I want to:** Have it continue working autonomously
**So that:** More gets done without babysitting

**Success criteria:**
- Works for hours, not minutes
- Produces substantial code
- Doesn't stop prematurely

### Job 2: ...
```

### Done Criteria
- [ ] JTBD defined (at least 3)
- [ ] Key user journeys mapped
- [ ] Current state analyzed (if applicable)
- [ ] Architecture approach decided
- [ ] Constraints documented

### Exit
Update `_status.md` → Layer 4

---

## Layer 4: Implementation Outline

### Purpose
Create high-level plan of major work chunks.

### Entry Criteria
- Layer 3 complete
- Clear understanding of what to build

### Process
1. Identify major chunks of work
2. Order by dependency (what must come first)
3. Estimate relative size/complexity
4. Identify risks per chunk

### Artifacts
```
/4-outline/
└── implementation-plan.md
```

### implementation-plan.md Format
```markdown
# Implementation Plan

## Overview
Brief description of what we're building.

## Chunks

### Chunk 1: [Name]
**Description:** What this chunk accomplishes
**Dependencies:** None / Chunk N
**Risk:** Low/Medium/High
**Notes:** Any special considerations

### Chunk 2: [Name]
**Description:** ...
**Dependencies:** Chunk 1
**Risk:** ...

...

## Order of Operations
1. Chunk 1 (no dependencies)
2. Chunk 2 (depends on 1)
3. Chunk 3 & 4 (parallel, both depend on 2)
5. Chunk 5 (depends on 3 & 4)

## Open Questions
- Any unresolved decisions to make during implementation
```

### Done Criteria
- [ ] All major chunks identified
- [ ] Dependencies mapped
- [ ] Order determined
- [ ] No critical open questions

### Exit
Update `_status.md` → Layer 5 (first chunk)

---

## Layer 5: Chunk Planning

### Purpose
Create detailed specs for each item in a chunk.

### Entry Criteria
- Layer 4 complete (or previous chunk passed review)
- Chunk's dependencies satisfied

### Process
1. Create chunk folder in `/5-chunks/`
2. Create `_index.md` with sub-outline
3. Create spec file for each item
4. Ensure specs are detailed enough to implement

### Artifacts
```
/5-chunks/chunk-NN-name/
├── _index.md               # Sub-outline
├── _review.md              # (created later by GAN)
├── spec-item-1.md
├── spec-item-2.md
└── spec-item-3.md
```

### _index.md Format
```markdown
# Chunk: [Name]

## Overview
What this chunk accomplishes.

## Items

### 1. [Item Name]
**Spec:** spec-item-1.md
**Status:** todo | in-progress | done | review-failed
**Description:** Brief description

### 2. [Item Name]
**Spec:** spec-item-2.md
**Status:** todo
**Description:** ...

## Dependencies
- Requires: chunk-01-xxx (complete)
- Blocks: chunk-03-xxx

## Notes
Any chunk-level considerations.
```

### spec-*.md Format
```markdown
# Spec: [Item Name]

## Overview
What this item accomplishes.

## Requirements
- Requirement 1
- Requirement 2
- Requirement 3

## Technical Approach
How to implement this.

## Files to Create/Modify
- `path/to/file.ts` - description of changes
- `path/to/new-file.ts` - new file purpose

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Test Plan
How to verify this works.

## Edge Cases
- Edge case 1: how to handle
- Edge case 2: how to handle
```

### Done Criteria
- [ ] `_index.md` created with all items
- [ ] Spec file created for each item
- [ ] Specs have sufficient detail to implement
- [ ] Acceptance criteria defined for each

### Exit
Update `_status.md` → Layer 6 (first item in chunk)

---

## Layer 6: Implementation

### Purpose
Build what's specified.

### Entry Criteria
- Layer 5 complete for current chunk
- Spec file exists for current item

### Process
1. Read spec file
2. Implement requirements
3. Verify acceptance criteria
4. Run tests
5. Commit code
6. Update item status in `_index.md`
7. Move to next item or Layer 7

### Commit Format
```
[L6] Implement {item-name}

Chunk: {chunk-name}
Spec: {spec-file}

- Implemented: {brief list}
- Tests: passing/added
```

### Done Criteria (per item)
- [ ] All requirements implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code committed
- [ ] Item status updated in `_index.md`

### Done Criteria (chunk)
- [ ] All items in chunk implemented
- [ ] All tests passing

### Exit
Update `_status.md` → Layer 7 (chunk review)

---

## Layer 7: Chunk Review (GAN)

### Purpose
Adversarial review of completed chunk.

### Entry Criteria
- Layer 6 complete for chunk
- All items implemented

### Process
1. Switch to GAN reviewer persona
2. Review each spec vs implementation
3. Test functionality via /chrome
4. Assess UX quality (not just "works")
5. Check edge cases
6. Write `_review.md`

### _review.md Format
```markdown
# Review: [Chunk Name]

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD
**Iteration:** N of 3

## Verdict
**PASS** or **FAIL**

## Items Reviewed

### spec-item-1.md
**Status:** PASS / FAIL
**Notes:** ...

### spec-item-2.md
**Status:** PASS / FAIL
**Issues:**
- Issue description (MINOR/MAJOR)

## Overall Issues

### Issue 1: [Title]
**Severity:** MINOR | MAJOR
**Spec:** spec-xxx.md
**Description:** What's wrong
**Evidence:** What I observed
**Recommendation:** How to fix

## What Worked Well
- Good thing 1
- Good thing 2

## Recommendations
- Even if PASS, suggestions for improvement
```

### On PASS
- Update `_index.md` statuses to "done"
- Update `_status.md` → Layer 5 (next chunk) or Layer 8 (if all chunks done)

### On FAIL
- Increment iteration counter
- If iteration < 3:
  - MINOR issues → return to Layer 6
  - MAJOR issues → return to Layer 5, update specs
- If iteration >= 3:
  - Escalate to Layer 4 (re-outline chunk)

---

## Layer 8: Integration Testing

### Purpose
Verify features work together.

### Entry Criteria
- All chunks passed Layer 7 review

### Process
1. Define integration test scenarios
2. Run end-to-end tests
3. Test cross-feature interactions
4. Document results

### Artifacts
```
/6-integration/
├── test-plan.md
└── test-results.md
```

### Done Criteria
- [ ] Integration tests defined
- [ ] All tests executed
- [ ] Results documented
- [ ] All tests passing

### Exit
Update `_status.md` → Layer 9

---

## Layer 9: Final Review (GAN)

### Purpose
Full system review for quality, UX, design.

### Entry Criteria
- Layer 8 complete
- Integration tests passing

### Process
1. Full walkthrough of all features
2. Assess overall UX coherence
3. Check design consistency
4. Identify any remaining issues
5. Make final recommendation

### On PASS
- Update `_status.md` → Layer 10

### On FAIL
- Identify which chunks need rework
- Return to Layer 5 for those chunks
- (Severe issues may require Layer 3 or 4 rework)

---

## Layer 10: Analysis

### Purpose
Retrospective and learnings.

### Entry Criteria
- Layer 9 passed

### Process
1. Review what was built
2. Document what worked well
3. Document what didn't work
4. Extract learnings for future projects
5. Note methodology improvements

### Artifacts
```
/7-analysis/
└── retrospective.md
```

### retrospective.md Format
```markdown
# Project Retrospective

## Summary
Brief description of what was built.

## Timeline
- Started: DATE
- Completed: DATE
- Iterations: N

## What Worked Well
- Thing 1
- Thing 2

## What Didn't Work
- Thing 1
- Thing 2

## Learnings
- Learning 1
- Learning 2

## Methodology Notes
Suggestions for improving the V3 process itself.
```

### Done Criteria
- [ ] Retrospective complete
- [ ] Project marked complete in `_status.md`

### Exit
Project complete.

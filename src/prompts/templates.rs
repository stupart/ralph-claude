//! Prompt templates for each layer

pub const INPUT_INSTRUCTIONS: &str = r#"## Layer 1: Input

### Your Task
Gather raw material for this project. This includes:
- Brain dumps (unstructured thoughts, ideas, requirements)
- Research (web searches, documentation, competitor analysis)
- Designs (mockups, inspirations, references)
- Existing system analysis (if building on existing code)

### Process
1. Review any existing content in `/1-input/`
2. If the user has provided brain dumps, save them as `brain-dump-NNN.md`
3. If research is needed, create `research/` folder with findings
4. If designs exist, reference them in `designs/`
5. Create `existing-system-notes.md` if analyzing existing code

### Output Format
Save all input as markdown files in `/1-input/`

### Done When
- At least one substantial brain dump or requirements doc exists
- All referenced materials are gathered
- You have enough material to analyze

### Next
When complete, update `_status.md` to Layer 2 and proceed to Decomposition.
"#;

pub const DECOMPOSITION_INSTRUCTIONS: &str = r#"## Layer 2: Decomposition

### Your Task
Break down the raw input into organized, atomic pieces:
- Extract key quotes and statements
- Identify recurring patterns and themes
- Group related items (affinity mapping)
- Note contradictions or tensions

### Process
1. Read all files in `/1-input/`
2. Create `quotes.md` - extract exact quotes organized by category
3. Create `patterns.md` - identify recurring themes
4. Create `affinities.md` - group related items
5. Create `tensions.md` if contradictions exist

### Output Format
```markdown
# quotes.md
## User Desires
> "Exact quote from input"
Source: brain-dump-001.md

## Constraints
> "Another quote"
Source: research/findings.md
```

### Done When
- All input materials have been processed
- Quotes are extracted and categorized
- Patterns are identified
- Affinities are grouped

### Next
When complete, update `_status.md` to Layer 3 and proceed to Synthesis.
"#;

pub const SYNTHESIS_INSTRUCTIONS: &str = r#"## Layer 3: Synthesis

### Your Task
Transform decomposed pieces into actionable understanding:
- Define Jobs to Be Done (what the user is trying to accomplish)
- Map user journeys/flows
- Analyze current state (if existing system)
- Make architecture decisions
- Document constraints

### Process
1. Read all files in `/2-decomposition/`
2. Create `jtbd.md` - jobs to be done with success criteria
3. Create `journeys.md` - user flows and touchpoints
4. Create `architecture.md` - technical approach and decisions
5. Create `current-state.md` if analyzing existing code
6. Create `constraints.md` for limitations and boundaries

### JTBD Format
```markdown
## Job 1: [Name]
**When:** [Trigger/situation]
**I want to:** [Action/capability]
**So that:** [Outcome/benefit]

**Success Criteria:**
- Specific measurable outcome
- Another criterion
```

### Done When
- At least 3 JTBDs defined
- Key user journeys mapped
- Architecture approach decided
- Constraints documented

### Next
When complete, update `_status.md` to Layer 4 and proceed to Outline.
"#;

pub const OUTLINE_INSTRUCTIONS: &str = r#"## Layer 4: Implementation Outline

### Your Task
Create a high-level plan of major work chunks:
- Identify major pieces of work
- Order by dependency (what must come first)
- Estimate relative complexity
- Identify risks

### Process
1. Read all files in `/3-synthesis/`
2. Create `/4-outline/implementation-plan.md`
3. Break work into 3-7 chunks
4. Each chunk should be independently completable
5. Order by dependencies

### Output Format
```markdown
# Implementation Plan

## Overview
Brief description of what we're building.

## Chunks

### Chunk 1: [Name]
**Description:** What this accomplishes
**Dependencies:** None
**Risk:** Low/Medium/High
**Estimated Specs:** 3-5 items

### Chunk 2: [Name]
**Description:** ...
**Dependencies:** Chunk 1
**Risk:** Medium
**Estimated Specs:** 2-4 items

## Order of Operations
1. Chunk 1 (no dependencies)
2. Chunk 2 (depends on 1)
3. Chunk 3 (depends on 1)
4. Chunk 4 (depends on 2, 3)
```

### Done When
- All major chunks identified
- Dependencies mapped
- Order determined
- Each chunk has a clear scope

### Next
When complete, update `_status.md` to Layer 5 and proceed to Chunk Planning.
"#;

pub const CHUNK_PLANNING_INSTRUCTIONS: &str = r#"## Layer 5: Chunk Planning

### Your Task
Create detailed specs for each item in the current chunk:
- Create chunk folder in `/5-chunks/`
- Write `_index.md` with item list
- Create `spec-*.md` for each item
- Specs must be detailed enough to implement

### Process
1. Create `/5-chunks/{chunk-id}/` folder
2. Create `_index.md` with item outline
3. For each item, create `spec-{name}.md`
4. Include acceptance criteria and edge cases

### _index.md Format
```markdown
# Chunk: [Name]

## Overview
What this chunk accomplishes.

## Items

### 1. [Item Name]
**Spec:** spec-item-name.md
**Status:** todo
**Description:** Brief description

### 2. [Item Name]
**Spec:** spec-other-item.md
**Status:** todo
**Description:** ...
```

### spec-*.md Format
```markdown
# Spec: [Item Name]

## Overview
What this item accomplishes.

## Requirements
- Requirement 1
- Requirement 2

## Technical Approach
How to implement this.

## Files to Create/Modify
- `path/to/file.ts` - what changes

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Edge Cases
- Edge case 1: how to handle
```

### Done When
- All items have spec files
- Specs have acceptance criteria
- Edge cases documented

### Next
When chunk is planned, update `_status.md` to Layer 6 and proceed to Implementation.
"#;

pub const IMPLEMENTATION_INSTRUCTIONS: &str = r#"## Layer 6: Implementation

### Your Task
Build what's specified in the current spec:
- Follow the spec exactly
- Implement all requirements
- Handle edge cases
- Write tests if specified
- Commit after completing each item

### Process
1. Read the current spec file
2. Implement all requirements
3. Verify acceptance criteria
4. Run tests
5. Commit with format: `[L6] Implement {item-name}`
6. Update item status in `_index.md` to "done"
7. Move to next item or request review

### Commit Format
```
[L6] Implement {item-name}

Chunk: {chunk-id}
Spec: {spec-file}

- Implemented: {list of what was done}
- Tests: {passing/added}
```

### Done When (per item)
- All requirements implemented
- All acceptance criteria met
- Tests passing
- Code committed
- Status updated in _index.md

### Next
When all items in chunk are done, update `_status.md` to Layer 7 for Chunk Review.
"#;

pub const CHUNK_REVIEW_INSTRUCTIONS: &str = r#"## Layer 7: Chunk Review (GAN Mode)

### Your Role
You are now the CRITIC, not the builder. Be skeptical and thorough.

### Your Task
Review the completed chunk for quality:
- Test every acceptance criterion via /chrome
- Check UX quality (not just "works")
- Find edge cases the builder missed
- Assess error handling

### Process
1. Read all specs in the chunk
2. For each spec:
   - Test all acceptance criteria
   - Try edge cases
   - Note any issues
3. Write `_review.md` with verdict

### Testing Checklist
- [ ] Each acceptance criterion tested
- [ ] Happy path works
- [ ] Error cases handled
- [ ] Edge cases tested
- [ ] UX feels good (not just functional)

### _review.md Format
```markdown
# Review: [Chunk Name]

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD
**Iteration:** N of 3

## Verdict: PASS | FAIL

## Spec Reviews

### spec-item-1.md
**Status:** PASS
**Notes:** Works as specified.

### spec-item-2.md
**Status:** FAIL
**Issues:**
- Issue description (MINOR/MAJOR)

## Overall Issues
(Only if FAIL)

### Issue 1: [Title]
**Severity:** MINOR | MAJOR
**Description:** What's wrong
**Recommendation:** How to fix

## What Worked Well
- Positive observation

## Recommendations
- Suggestions for improvement
```

### Severity Guide
- **MINOR:** Has workaround, fix in Layer 6
- **MAJOR:** Core functionality broken, revise specs in Layer 5

### Next
- **PASS:** Update `_status.md`, proceed to next chunk or Integration
- **FAIL MINOR:** Return to Layer 6, fix specific issues
- **FAIL MAJOR:** Return to Layer 5, revise specs
- **3 failures:** Escalate to Layer 4
"#;

pub const INTEGRATION_INSTRUCTIONS: &str = r#"## Layer 8: Integration Testing

### Your Task
Verify that all chunks work together:
- Test cross-feature interactions
- Check shared state handling
- Run end-to-end flows
- Verify performance

### Process
1. Review all chunk reviews
2. Define integration test scenarios
3. Run end-to-end tests via /chrome
4. Document results in `/6-integration/test-results.md`

### test-results.md Format
```markdown
# Integration Test Results

**Date:** YYYY-MM-DD

## Test Scenarios

### Scenario 1: [Name]
**Flow:** Step 1 → Step 2 → Step 3
**Result:** PASS | FAIL
**Notes:** Observations

### Scenario 2: [Name]
...

## Cross-Feature Tests

### [Feature A] + [Feature B]
**Result:** PASS | FAIL
**Notes:** How they interact

## Performance

### Page Load
**Result:** Acceptable | Slow
**Notes:** Observations

## Overall Verdict
All tests passing: YES | NO
```

### Done When
- All integration scenarios tested
- Cross-feature interactions verified
- Results documented
- All tests passing

### Next
When complete, update `_status.md` to Layer 9 for Final Review.
"#;

pub const FINAL_REVIEW_INSTRUCTIONS: &str = r#"## Layer 9: Final Review (GAN Mode)

### Your Role
You are the final quality gate. Be thorough and user-focused.

### Your Task
Full system review:
- Complete UX walkthrough
- Check design consistency
- Verify all features work together
- Assess overall quality

### Process
1. Full walkthrough of all features via /chrome
2. Check UX coherence across features
3. Verify design consistency
4. Test error handling
5. Document in `/6-integration/final-review.md`

### Review Checklist
- [ ] All features accessible and working
- [ ] UX is consistent across features
- [ ] Error messages are helpful
- [ ] No broken states or dead ends
- [ ] Performance is acceptable
- [ ] Would you ship this?

### final-review.md Format
```markdown
# Final Review

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD

## Verdict: PASS | FAIL

## UX Walkthrough

### Feature 1: [Name]
**Status:** PASS | FAIL
**Notes:** Observations

### Feature 2: [Name]
...

## Design Consistency
**Status:** PASS | FAIL
**Notes:** Observations

## Error Handling
**Status:** PASS | FAIL
**Notes:** Observations

## Overall Assessment

### What Works Well
- Positive observations

### Issues (if FAIL)
- Issue 1 (which chunk to fix)
- Issue 2

### Recommendation
Ship / Fix and re-review / Major rework needed
```

### Next
- **PASS:** Update `_status.md` to Layer 10 for Analysis
- **FAIL:** Identify chunks needing rework, return to Layer 5
"#;

pub const ANALYSIS_INSTRUCTIONS: &str = r#"## Layer 10: Analysis

### Your Task
Write project retrospective:
- Summarize what was built
- Document what worked well
- Document what didn't work
- Extract learnings for future projects
- Note methodology improvements

### Process
1. Review project history
2. Review all artifacts
3. Write `/7-analysis/retrospective.md`

### retrospective.md Format
```markdown
# Project Retrospective

## Summary
Brief description of what was built.

## Timeline
- **Started:** DATE
- **Completed:** DATE
- **Total Iterations:** N
- **Review Failures:** N

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
Suggestions for improving the V3 process:
- Observation 1
- Observation 2

## Final Stats
- Chunks completed: N
- Total specs: N
- Commits: N
```

### Done When
- Retrospective is complete
- Learnings are actionable

### Next
Project complete! Update `_status.md` to mark project done.
"#;

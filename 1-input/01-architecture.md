# V3 Architecture: Layered Methodology

## Overview

Ralph V3 uses a **layered generation** approach where work flows through progressive refinement stages. Each layer adds specificity. Failure at any layer triggers re-work at that layer and all layers below.

---

## The Layers

### Layer 1: Input
**Purpose:** Gather raw material
**Artifacts:** Brain dumps, audio transcripts, research, designs, references
**Done when:** Sufficient raw material to analyze
**Commits:** No code commits, just docs

### Layer 2: Decomposition
**Purpose:** Break down raw input into atomic pieces
**Artifacts:** Extracted quotes, identified patterns, affinity groups
**Done when:** All input processed, patterns identified
**Commits:** Docs only

### Layer 3: Synthesis
**Purpose:** Transform decomposed pieces into actionable specs
**Artifacts:** JTBD, customer journeys, architecture decisions, current state analysis
**Done when:** Clear picture of what to build and why
**Commits:** Docs only

### Layer 4: Implementation Outline
**Purpose:** High-level plan of major work chunks
**Artifacts:** `outline.md` with numbered chunks
**Done when:** All major chunks identified and ordered
**Commits:** Docs only

### Layer 5: Chunk Planning
**Purpose:** Detailed planning for each chunk
**Artifacts:** Per-chunk folder with `_index.md` (sub-outline) and spec files
**Done when:** Each chunk has complete specs for all items
**Commits:** Docs only

### Layer 6: Implementation
**Purpose:** Build what's specified
**Artifacts:** Code, tests, working features
**Done when:** All specs implemented, tests passing
**Commits:** **Code commits after each spec item**

### Layer 7: Chunk Review (GAN)
**Purpose:** Adversarial review of completed chunk
**Artifacts:** `_review.md` with pass/fail and issues
**Done when:** Review complete
**Review triggers:** Chunk implementation complete

**On PASS:** Advance to next chunk (back to Layer 5)
**On FAIL:** Generate issues → return to Layer 5 or 6 for this chunk

### Layer 8: Integration Testing
**Purpose:** Test features working together
**Artifacts:** Integration test results
**Done when:** All integration tests pass
**Review triggers:** All chunks complete

### Layer 9: Final Review (GAN)
**Purpose:** Full system review - UX, design, quality
**Artifacts:** Final review document
**Done when:** Review complete

**On PASS:** Advance to Layer 10
**On FAIL:** Identify which chunks need rework → return to Layer 5

### Layer 10: Analysis
**Purpose:** Retrospective and learnings
**Artifacts:** `retrospective.md`
**Done when:** Analysis complete

---

## Folder Structure

```
/ralph-project
├── _status.md                      # System state
├── /1-input
│   ├── brain-dump-001.md
│   ├── brain-dump-002.md
│   └── research/
├── /2-decomposition
│   ├── quotes.md
│   ├── patterns.md
│   └── affinities.md
├── /3-synthesis
│   ├── jtbd.md
│   ├── journeys.md
│   ├── architecture.md
│   └── current-state.md
├── /4-outline
│   └── implementation-plan.md
├── /5-chunks
│   ├── /chunk-01-auth
│   │   ├── _index.md               # Sub-outline for chunk
│   │   ├── _review.md              # GAN review results
│   │   ├── spec-login.md
│   │   ├── spec-session.md
│   │   └── spec-logout.md
│   ├── /chunk-02-onboarding
│   │   ├── _index.md
│   │   ├── _review.md
│   │   └── ...specs
│   └── /chunk-NN-xxx
├── /6-integration
│   └── test-results.md
└── /7-analysis
    └── retrospective.md
```

---

## _status.md Format

```markdown
# Project Status

## Current Position
- **Layer:** 6 (Implementation)
- **Chunk:** chunk-02-onboarding
- **Item:** spec-thought-experiments.md
- **Iteration:** 1 of 3

## Progress
- [x] Layer 1: Input (complete)
- [x] Layer 2: Decomposition (complete)
- [x] Layer 3: Synthesis (complete)
- [x] Layer 4: Outline (complete)
- [ ] Layer 5-7: Chunks
  - [x] chunk-01-auth (passed review)
  - [ ] chunk-02-onboarding (in progress)
  - [ ] chunk-03-daily-mode
- [ ] Layer 8: Integration
- [ ] Layer 9: Final Review
- [ ] Layer 10: Analysis

## Current Task
Implementing thought experiments feature per spec-thought-experiments.md

## Blockers
None

## Last Updated
2024-01-27T14:30:00Z
```

---

## Failure & Re-planning

When a review fails:

1. **GAN writes `_review.md`** with:
   - PASS or FAIL
   - List of issues (if FAIL)
   - Severity: MINOR (fix in Layer 6) or MAJOR (re-plan in Layer 5)

2. **MINOR issues:** Return to Layer 6, fix specific items

3. **MAJOR issues:** Return to Layer 5
   - Update `_index.md` with new/revised specs
   - Create new spec files as needed
   - Then proceed through Layer 6, 7 again

4. **Max iterations:** 3 per chunk
   - After 3 failures, escalate to Layer 4 (re-outline)
   - This prevents infinite loops

5. **Layer 4 re-planning:**
   - May split chunk into smaller chunks
   - May reorder chunks
   - May identify missing synthesis (back to Layer 3)

---

## Context Handoff (Session Restart)

When starting a new Claude session, send this prompt:

```markdown
# Ralph V3 Task Prompt

## Project
{project_name}

## Current Status
{contents of _status.md}

## Relevant Context

### Current Chunk Index
{contents of current chunk's _index.md}

### Current Spec (if in Layer 6)
{contents of current spec file}

### Recent Review (if any)
{contents of _review.md if exists}

## Your Task
Continue from the current position. Follow the V3 methodology:
1. Check _status.md for where you are
2. Complete the current item
3. Commit code after each spec item
4. Update _status.md when advancing
5. Request review when chunk complete

## Rules
- One spec at a time
- Commit after each spec
- Update _status.md after each state change
- Don't skip layers
```

---

## Commit Strategy

| Layer | Commit? | What |
|-------|---------|------|
| 1-4   | Optional | Docs only, batch is fine |
| 5     | Yes | After each spec file created |
| 6     | Yes | **After each spec implemented** |
| 7     | Yes | After review complete |
| 8     | Yes | After integration tests |
| 9     | Yes | After final review |
| 10    | Yes | After retrospective |

**Commit message format:**
```
[layer-N] description

Layer: N (Layer Name)
Chunk: chunk-name (if applicable)
Spec: spec-name (if applicable)
```

---

## Review Triggers

| Trigger | Review Type | Reviewer |
|---------|-------------|----------|
| All specs in chunk implemented | Chunk Review (GAN) | Critic AI |
| All chunks pass review | Integration Test | Automated + Critic |
| Integration passes | Final Review (GAN) | Critic AI |

---

## GAN Reviewer Prompt

```markdown
# Chunk Review Task

You are reviewing chunk: {chunk_name}

## Your Role
You are a critical reviewer focused on:
- Does it actually work? (test it via /chrome)
- Is the UX good? (not just functional)
- Are there edge cases missed?
- Does the code match the spec?
- Would a real user be happy?

## Specs Implemented
{list of spec files}

## Your Output
Write _review.md with:

### Verdict
PASS or FAIL

### Issues (if FAIL)
For each issue:
- **Issue:** Description
- **Severity:** MINOR or MAJOR
- **Spec:** Which spec it relates to
- **Evidence:** What you observed

### What Worked Well
Brief notes on good aspects

### Recommendations
Suggestions even if PASS
```

---

## Open Questions

1. **How does Ralph know which layer's rules to follow?**
   - Read _status.md at start
   - Each layer has specific "done" criteria

2. **How do we handle dependencies between chunks?**
   - Outline (Layer 4) should order chunks by dependency
   - Can note "blocked by chunk-XX" in _index.md

3. **What if synthesis was wrong?**
   - Final review can push all the way back to Layer 3
   - Rare but possible

4. **How verbose should status updates be?**
   - Every state change updates _status.md
   - Keeps human visibility high

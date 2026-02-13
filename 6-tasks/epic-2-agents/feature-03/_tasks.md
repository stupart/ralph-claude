# Tasks: Judge Agent Prompt and Context Package

## Task 1: Design Base Judge System Prompt

**What it accomplishes:** Creates the foundational Judge prompt establishing "GAN critic" identity with rigorous mindset, read-only tool permissions (Read, Glob, Grep, Bash, /chrome), and general review principles.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` (create)

**Dependencies:** None

**Verification:** Prompt establishes critic identity; explicitly excludes Write and Edit tools; emphasizes finding issues over rubber-stamping.

---

## Task 2: Create L3 Synthesis Review Prompt

**What it accomplishes:** Creates specialized prompt for L3 review that compares synthesis against original brain dump, verifies all patterns/tensions/quotes were captured, checks JTBD completeness.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L3-synthesis.md` (create)

**Dependencies:** Task 1 (need base prompt structure)

**Verification:** Prompt includes protocol for loading brain dump; has checklist for synthesis completeness; identifies gaps between input and synthesis.

---

## Task 3: Create L4 Epic Review Prompt with Scope Coverage

**What it accomplishes:** Creates specialized prompt for L4 review that verifies synthesis concepts trace to epics, no JTBD or architectural decisions are dropped, epic scope is comprehensive.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` (create)

**Dependencies:** Task 1 (need base prompt)

**Verification:** Prompt loads synthesis artifacts; includes traceability checklist (each JTBD → epic); identifies scope gaps.

---

## Task 4: Create L5-L7 Planning Review Prompts

**What it accomplishes:** Creates specialized prompts for L5, L6, L7 reviews with scope coverage verification at each level - ensuring features cover epics, tasks cover features, subtasks are builder-ready.

**Time estimate:** ~30 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-features.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L6-tasks.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L7-subtasks.md` (create)

**Dependencies:** Tasks 1-3 (need base prompt and L3-L4 patterns)

**Verification:** Each prompt has layer-specific criteria; L7 specifically checks builder-readiness; all include scope coverage protocol.

---

## Task 5: Create L9 Feature Review Prompt

**What it accomplishes:** Creates specialized prompt for L9 review with acceptance criteria verification, /chrome testing protocol, UX quality assessment.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L9-feature-review.md` (create)

**Dependencies:** Task 1 (need base prompt)

**Verification:** Prompt includes step-by-step /chrome testing instructions; acceptance criteria checklist; UX quality rubric.

---

## Task 6: Create L10-L11 Integration and Final Review Prompts

**What it accomplishes:** Creates specialized prompts for L10 (epic integration review) and L11 (final review) with cross-feature testing, ship-worthiness assessment.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L10-epic-review.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-L11-final-review.md` (create)

**Dependencies:** Task 5 (builds on L9 patterns)

**Verification:** L10 focuses on integration; L11 includes "would I be proud to ship this?" and full scope verification against original synthesis.

---

## Task 7: Implement Scope Coverage Protocol

**What it accomplishes:** Creates a reusable protocol for scope coverage checking - loading synthesis artifacts, creating traceability matrix, identifying gaps.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/protocols/scope-coverage-protocol.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/protocols/traceability-matrix-template.md` (create)

**Dependencies:** Tasks 2-4 (need layer prompts to understand what's being traced)

**Verification:** Protocol specifies which synthesis files to load; traceability matrix format is clear; gap identification criteria are explicit.

---

## Task 8: Define Review Output Template and Severity Classification

**What it accomplishes:** Creates the standard review output format with verdict (PASS/ITERATE), issues list with MINOR/MAJOR/ESCALATE classification, cascade decision, and scope coverage summary.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` (create)

**Dependencies:** Tasks 2-7 (need all review types to understand output needs)

**Verification:** Template includes verdict field; issues have severity classification; cascade decision specifies target layer; scope coverage summary section exists.

---

## Task 9: Implement Graduated Rigor Rules

**What it accomplishes:** Adds iteration-aware instructions to all layer prompts: iteration 1 is comprehensive review, iteration 2 focuses on original issues, iteration 3+ focuses only on blockers.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` (modify to add graduated rigor)
- All layer-specific prompts (modify to reference graduated rigor)

**Dependencies:** Tasks 1-8 (need all prompts created)

**Verification:** Graduated rigor section exists in base prompt; behavior differs by iteration count; iteration 3+ explicitly ignores new minor issues.

---

## Task 10: Test All Layer-Specific Prompts

**What it accomplishes:** Creates test cases for each layer-specific Judge prompt, verifying correct behavior with sample artifacts including scope coverage gaps.

**Time estimate:** ~30 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/judge-L3-test.md` (create)
- `/Users/tylerstupart/ralph-claude/tests/judge-L4-test.md` (create)
- `/Users/tylerstupart/ralph-claude/tests/judge-L5-L7-test.md` (create)
- `/Users/tylerstupart/ralph-claude/tests/judge-L9-L11-test.md` (create)
- `/Users/tylerstupart/ralph-claude/tests/scope-coverage-test.md` (create)

**Dependencies:** Tasks 1-9 (complete prompts needed)

**Verification:** Test cases exist for each layer; include both passing and failing examples; scope coverage gaps are tested; expected outputs documented.

---

## Task 11: Implement N/A Appropriateness Review

**What it accomplishes:** Adds specific criteria to Judge prompts for evaluating whether N/A sections in Planner artifacts are justified, ensuring the Judge flags inappropriate use of N/A as a severity issue.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` (modify to add N/A review criteria)
- `/Users/tylerstupart/ralph-claude/templates/protocols/na-review-protocol.md` (create)

**Dependencies:** Task 7 (scope coverage protocol)

**Verification:** Judge prompt includes N/A appropriateness checklist; protocol defines when N/A is acceptable vs lazy; unjustified N/A flagged as MINOR or MAJOR based on section importance; integrates with scope coverage review.

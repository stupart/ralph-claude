# Review: L9 Feature Review - Epic 2: Agent System Implementation

**Date:** 2026-01-29
**Reviewer:** Judge Agent
**Iteration:** 1
**Review Type:** Build

---

## Verdict: ITERATE

---

## Summary

The agent system implementation delivers solid foundational templates for all three agents and supporting protocols, but has significant gaps in layer-specific Judge coverage, a contradiction in the Judge's Write permissions, missing L6 Judge prompt, and several acceptance criteria that are not fully met.

---

## Issues Found

### Issue 1: Missing L6 Judge Prompt - Spec Requires Individual Layer Prompts

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-L7-planning.md`
- **Category:** Completeness

**Description:**
The feature-03 spec explicitly requires "LAYER-SPECIFIC PROMPTS: Each review layer (L3, L4, L5, L6, L7, L9, L10, L11) must have a specialized prompt with layer-specific criteria" (Requirement 11). The technical approach further specifies separate prompts for L5, L6, and L7. Instead, L5, L6, and L7 were collapsed into a single combined file `judge-L5-L7-planning.md`.

While the combined file does contain separate sections for L5, L6, and L7, the spec acceptance criteria state "LAYER-SPECIFIC prompts exist for each review layer (L3, L4, L5, L6, L7, L9, L10, L11)." The technical approach explicitly calls for "Store prompts in templates/agents/judge-L{N}.md (one per review layer)." L6 has unique concerns (task completeness, time estimates, file path listings) that deserve standalone treatment equivalent to L3 and L4.

**Evidence:**
The spec technical approach section 7 says: "Store prompts in templates/agents/judge-L{N}.md (one per review layer)." What was built is `judge-L5-L7-planning.md` - a combined file rather than individual files.

**Impact:**
When Ralph needs to inject layer-specific instructions into the Judge base template via the `{{LAYER_INSTRUCTIONS}}` placeholder, having a combined file forces loading instructions for all three layers when only one is needed, adding context noise.

**Recommendation:**
Split `judge-L5-L7-planning.md` into three files: `judge-L5-features.md`, `judge-L6-tasks.md`, `judge-L7-subtasks.md`. Each should be a standalone prompt loadable into the `{{LAYER_INSTRUCTIONS}}` slot.

---

### Issue 2: Judge Base Prompt Says "Write review output" Despite Write Being Forbidden

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md`, line 165
- **Category:** Integration

**Description:**
The Judge base prompt's "When You're Done" section instructs: "1. Write review output to the specified location." However, the Judge's tool permissions explicitly forbid the Write tool. The forbidden tools section on line 50-54 correctly states Write is not available. This is a direct internal contradiction.

**Evidence:**
Line 50-54 of judge-base.md: "**Write** - You don't create artifacts" is listed as forbidden. Line 165: "Write review output to the specified location" instructs using the forbidden tool. The tool-permissions.md document also confirms Judge has no Write access.

**Impact:**
The Judge agent will either attempt to use Write (which should fail per tool permissions) or be confused by contradictory instructions. Either way, it cannot persist its review output as instructed.

**Recommendation:**
Clarify how the Judge's review output gets persisted. Options: (1) The Judge returns review output in its response and Ralph writes it, or (2) The Judge is given a narrow exception to Write only for review output files. Update the "When You're Done" section to match whichever approach is chosen. If option 1, change to "Return review output in your response for Ralph to persist."

---

### Issue 3: Planner Prompt Missing L12 (Analysis/Retrospective) Instructions

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/planner-base.md`
- **Category:** Completeness

**Description:**
Feature-01 spec requirement 2 states: "Prompt must include layer-specific instructions that can be parameterized per layer (L1-L7, L12)." The planner-base.md has a `{{LAYER_INSTRUCTIONS}}` placeholder but no corresponding L12 prompt fragment was created. The spec planned task 4 explicitly calls for "Create layer-specific prompt fragment for L12 (Analysis phase)."

**Evidence:**
No file matching `planner-L12*` or any L12-specific fragment exists in `templates/agents/`. The Planner base prompt mentions layers L1-L7 but does not reference L12 at all. The spec edge case section specifically discusses "L12 after failed reviews."

**Impact:**
When the project reaches L12 (retrospective/analysis), there are no instructions for the Planner on how to write the retrospective document. The Planner will operate with only the generic base prompt.

**Recommendation:**
Create a `planner-L12-retrospective.md` fragment that covers: what to analyze, how to structure the retrospective, what data to gather (iteration counts, review feedback history, etc.), and the output format.

---

### Issue 4: No Layer-Specific Planner Prompt Fragments Exist At All

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/`
- **Category:** Completeness

**Description:**
The Planner base prompt has a `{{LAYER_INSTRUCTIONS}}` placeholder on line 61, but there are zero layer-specific prompt fragments for any layer (L1-L7, L12). Feature-01 planned tasks 2, 3, and 4 explicitly require: "Create layer-specific prompt fragments for L1-L3 (Understand phase)", "Create layer-specific prompt fragments for L4-L7 (Plan phase)", and "Create layer-specific prompt fragment for L12 (Analysis phase)."

**Evidence:**
Only `planner-base.md` exists in `templates/agents/`. No `planner-L1*`, `planner-L2*`, etc. files exist. The Judge has five layer-specific files (L3, L4, L5-L7, L9, L10-L11) but the Planner has none.

**Impact:**
The `{{LAYER_INSTRUCTIONS}}` placeholder has nothing to inject. Ralph will have to either leave it empty or fabricate instructions at runtime. The Planner at L1 (raw input reading) has very different work than at L7 (subtask decomposition), but both would receive identical base instructions with no layer-specific guidance.

**Recommendation:**
Create at minimum: `planner-L1-L2-input.md` (reading/decomposing raw input), `planner-L3-synthesis.md` (synthesizing JTBD/journeys/architecture), `planner-L4-epics.md` (defining epics), `planner-L5-features.md` (defining features), `planner-L6-tasks.md` (defining tasks), `planner-L7-subtasks.md` (defining subtasks). Each should specify context loading, output templates, and layer-specific minimum counts.

---

### Issue 5: Handoff Protocol Missing Transition Points for L10 and L11

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/protocols/agent-handoff-protocol.md`
- **Category:** Completeness

**Description:**
The handoff protocol defines 5 transition types: Planner->Judge (plan review), Judge->Planner (iterate), Planner->Builder (L7->L8), Builder->Judge (L8->L9), and Judge->Builder (iterate). It does not define handoffs for L9->L10 (feature pass -> epic integration review) or L10->L11 (epic pass -> final review). These are Judge->Judge transitions within the review phase.

**Evidence:**
Feature-04 spec requirement says "Handoffs occur at multiple points: Planner to Judge (plan review), Judge to Planner (iteration), Planner to Builder (L7->L8), Builder to Judge (L8->L9), etc." The "etc." implies additional transitions. The Judge L10 prompt requires "All features in the epic are at PASS from L9" and L11 requires "All epics have passed L10" - these are distinct transitions with different context needs.

**Impact:**
When Ralph transitions from L9 PASS to L10, or L10 PASS to L11, there is no defined handoff schema specifying what context the new Judge instance needs. The L10 Judge needs aggregated L9 results across features; the L11 Judge needs aggregated L10 results across epics.

**Recommendation:**
Add two more handoff types: (1) Judge L9 -> Judge L10 (feature reviews aggregated for epic integration), and (2) Judge L10 -> Judge L11 (epic reviews aggregated for final review). Include the specific context each needs (list of passed features, cross-feature integration points, etc.).

---

### Issue 6: Tool Permissions - Judge Bash "LIMITED" Is Underspecified in Agent Prompt

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md`, line 45
- **Category:** Quality

**Description:**
The Judge base prompt lists Bash as allowed with the note "Run tests ONLY (no modifications)." While the `tool-permissions.md` document provides a detailed allowlist/blocklist for Judge Bash usage (specific commands like `npm test`, `pytest`, etc.), this detail is not included in the Judge prompt itself.

**Evidence:**
`tool-permissions.md` lines 73-89 define specific allowed and forbidden Bash patterns. `judge-base.md` line 45 says only: "**Bash** - Run tests ONLY (no modifications)." An LLM agent seeing "run tests only" may interpret this loosely and run `npm install` or `git status` believing those are harmless.

**Impact:**
Without explicit guardrails in the prompt, the Judge may execute non-test Bash commands that modify state (e.g., `npm install`, `git checkout`).

**Recommendation:**
Add the specific Bash allowlist/blocklist from `tool-permissions.md` into the Judge base prompt, or at minimum reference the protocol document and include the key restrictions.

---

### Issue 7: Builder Prompt Missing /chrome in Forbidden Tools

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/builder.md`
- **Category:** Completeness

**Description:**
The `tool-permissions.md` document explicitly lists `/chrome` as forbidden for the Builder agent. However, the Builder prompt does not mention `/chrome` at all - neither in allowed tools nor in a forbidden tools section. The Builder prompt has no "Forbidden Tools" section.

**Evidence:**
`tool-permissions.md` line 42: Builder's `"forbidden": ["/chrome"]`. `builder.md` lists only allowed tools and has no forbidden tools section. The Planner and Judge prompts both have explicit "Forbidden Tools" sections.

**Impact:**
Without a forbidden tools section, the Builder may attempt to use /chrome for self-verification, crossing into Judge territory and violating separation of concerns.

**Recommendation:**
Add a "Forbidden Tools" section to the Builder prompt listing `/chrome` with the rationale: "UX testing is the Judge's responsibility. Focus on tests, not visual verification."

---

### Issue 8: Scope Coverage Protocol Not Referenced in L5-L7 Judge Prompt

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-L7-planning.md`
- **Category:** Integration

**Description:**
A standalone `scope-coverage-protocol.md` exists with a detailed traceability matrix methodology. However, the `judge-L5-L7-planning.md` prompt only has a lightweight "Scope Coverage" section for each layer (e.g., "Does this epic's features collectively cover...") without referencing the full protocol or its traceability matrix template.

**Evidence:**
`scope-coverage-protocol.md` defines a 5-step protocol with coverage statistics and pass thresholds. The L5-L7 Judge prompt has simple bullet-point checklists under "Scope Coverage" but does not reference or incorporate the protocol's traceability matrix, gap documentation format, or coverage percentage calculations.

**Impact:**
The L5-L7 Judge will perform a shallow scope coverage check rather than the rigorous traceability analysis defined in the protocol.

**Recommendation:**
Either incorporate the scope coverage protocol steps directly into each layer section of the L5-L7 prompt, or add a clear reference: "Follow the Scope Coverage Protocol (scope-coverage-protocol.md) for traceability verification."

---

### Issue 9: Review Output Template Has Category Field Not Present in Judge Base Prompt

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/review-output-template.md` vs `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md`
- **Category:** Integration

**Description:**
The review-output-template.md includes a "Category" field for each issue (Completeness, Quality, Integration, UX, Performance, Security). The judge-base.md review output format section does not include this field. The two templates are inconsistent.

**Evidence:**
`review-output-template.md` line 34: `- **Category:** {Completeness | Quality | Integration | UX | Performance | Security}`. `judge-base.md` line 110-115: The issue format includes Severity, Location, Description, Evidence, and Recommendation - but no Category.

**Impact:**
If the Judge follows the base prompt format, reviews will lack categorization. If it follows the template, the base prompt's format section is misleading.

**Recommendation:**
Add the Category field to the judge-base.md review output format section to match the review-output-template.md.

---

### Issue 10: Handoff Protocol Does Not Define ESCALATE Cascade Handoffs

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/templates/protocols/agent-handoff-protocol.md`
- **Category:** Completeness

**Description:**
The Judge can issue ESCALATE severity findings that cascade work back multiple layers (e.g., from L9 back to L5, or from L11 back to L4). The handoff protocol only defines direct transitions between adjacent steps. There is no schema for multi-layer cascades triggered by ESCALATE verdicts.

**Evidence:**
`judge-L9-feature-review.md` defines ESCALATE cascading to L6. `judge-L10-L11-reviews.md` defines ESCALATE cascading to L4 or L5. The handoff protocol has no "cascade" or "escalate" handoff type that covers these multi-layer jumps.

**Impact:**
When an ESCALATE verdict is issued, Ralph has no defined handoff schema for the multi-layer jump. The context needs are different from a simple iterate - the receiving Planner needs to understand why work jumped back multiple layers.

**Recommendation:**
Add a "Cascade Handoff" type that includes: the originating review layer, the target layer, the escalation chain, and what synthesis/planning context needs to be re-loaded.

---

## What's Working Well

- The Judge base prompt establishes a strong adversarial identity with the "Good Critic vs Bad Critic" table - this is a smart inclusion that gives the LLM concrete behavioral guardrails.
- The graduated rigor system (Iteration 1: comprehensive, Iteration 2: focused, Iteration 3+: pragmatic) is well-defined and consistently present across all Judge layer prompts.
- The tool-permissions.md document is thorough, with clear rationale for each decision, specific error messages for violations, and even a development bypass mechanism with appropriate warnings.
- The scope-coverage-protocol.md and na-review-protocol.md are well-structured standalone protocols that address real risks (dropped requirements, lazy N/A usage).
- The Builder prompt is solid - clear commit protocol, iteration handling, and error handling instructions.
- The handoff protocol's `_status.md` persistence mechanism is practical and filesystem-native, fitting the Layer Cake philosophy.

---

## Scope Coverage Summary

| Acceptance Criterion (Feature 01 - Planner) | Status |
|----------------------------------------------|--------|
| Planner system prompt exists | COVERED |
| Prompt parameterizable with current layer | PARTIAL - placeholder exists but no fragments |
| Context loading rules per layer | PARTIAL - generic only, not layer-specific |
| Tool permissions explicitly stated | COVERED |
| Minimum counts enforced | COVERED |
| Correct output paths from LAYER_CAKE | NOT VERIFIED - no layer fragments to check |

| Acceptance Criterion (Feature 02 - Builder) | Status |
|----------------------------------------------|--------|
| Builder system prompt exists | COVERED |
| Prompt forbids improvisation | COVERED |
| Context loading pulls task spec only | COVERED |
| Full toolset permissions | COVERED |
| Test execution instructions | COVERED |
| Commit message format specified | COVERED |
| Builder stops on test failure | COVERED |

| Acceptance Criterion (Feature 03 - Judge) | Status |
|---------------------------------------------|--------|
| Rigorous critic identity established | COVERED |
| Layer-specific prompts for each layer | PARTIAL - L5/L6/L7 combined |
| L3 synthesis-vs-brain-dump comparison | COVERED |
| L4-L7 scope coverage verification | PARTIAL - lightweight, not full protocol |
| L9-L11 UX testing via /chrome | COVERED |
| Write and Edit excluded | COVERED (but contradicted in completion steps) |
| Standard review template with verdict | COVERED |
| Issue severity classification | COVERED |
| Cascade decision in output | COVERED |
| Graduated rigor incorporated | COVERED |

| Acceptance Criterion (Feature 04 - Handoff) | Status |
|-----------------------------------------------|--------|
| Handoff data structure defined | COVERED |
| Each transition type has defined contents | PARTIAL - L10/L11 transitions missing |
| Handoff persists to filesystem | COVERED |
| Receiving agent can reconstruct context | COVERED |
| No critical info lost | NOT VERIFIED |
| Iteration count included | COVERED |
| Session resume from persisted handoff | COVERED |

| Acceptance Criterion (Feature 05 - Permissions) | Status |
|---------------------------------------------------|--------|
| Permission configuration exists | COVERED |
| Planner cannot use Bash or Edit | COVERED |
| Builder has all tools | COVERED |
| Judge cannot use Write or Edit | COVERED |
| Forbidden tool produces clear error | COVERED |
| Violations logged | COVERED |
| Configuration readable and auditable | COVERED |

---

## Cascade Decision

**Based on issues found:**

| Issue Severity | Count | Cascade Target |
|---------------|-------|----------------|
| MINOR | 6 | L8 (fix and retry) |
| MAJOR | 4 | L8 (create missing artifacts) |
| ESCALATE | 0 | N/A |

**Primary cascade:** Return to **L8** because the missing artifacts (Planner layer fragments, split Judge L5/L6/L7 files) are implementation gaps that can be addressed without re-specifying features. The specs are clear about what is needed; the work was simply not completed.

---

## Checklist for Next Iteration

- [ ] Create Planner layer-specific prompt fragments for L1-L2, L3, L4, L5, L6, L7, and L12
- [ ] Split `judge-L5-L7-planning.md` into three separate files: L5, L6, L7
- [ ] Fix Judge base prompt "When You're Done" section to not instruct using forbidden Write tool
- [ ] Add "Forbidden Tools" section to Builder prompt listing /chrome
- [ ] Add Bash allowlist/blocklist details to Judge base prompt
- [ ] Add L10 and L11 handoff transition schemas to handoff protocol
- [ ] Add ESCALATE/cascade handoff type to handoff protocol
- [ ] Add scope-coverage-protocol reference to L5-L7 Judge prompts
- [ ] Add Category field to judge-base.md review output format

---

## Reviewer Notes

The overall architecture is sound. The three-agent model with clear separation of concerns is well-expressed in the prompts. The supporting protocols (scope coverage, N/A review, tool permissions) add genuine value beyond the base agent prompts.

The most significant gap is the complete absence of Planner layer fragments. The Planner operates across 9 different layers (L1-L7 plus L12), each with fundamentally different work products and context needs. Without layer-specific instructions, the Planner agent will receive only generic "decompose and plan" guidance regardless of whether it is reading raw brain dumps (L1) or defining atomic subtasks (L7). This is the single highest-impact fix.

The Judge prompts are substantially more complete than the Planner prompts, which suggests the Judge was prioritized during implementation. The Judge L3 and L4 prompts are particularly well-done with specific review protocols, checklists, and severity guides.

The Model Requirement (Opus) is correctly specified in all three agent base prompts (planner-base.md, builder.md, judge-base.md). Layer-specific Judge prompts do not repeat this requirement, which is acceptable since they inject into the base prompt.

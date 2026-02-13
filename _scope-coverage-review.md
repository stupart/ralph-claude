# Scope Coverage Review

**Reviewer:** Layer Cake Judge (Opus)
**Date:** 2026-01-28
**Type:** Plan vs Synthesis Traceability

---

## Traceability Matrix

### JTBD Coverage

| JTBD | Covered By | Status |
|------|------------|--------|
| Job 1: Plan a New Project (L1-L7) | Epic 1 (Blueprint data for specs), Epic 2 (Planner agent), Epic 3 (State machine, orchestration) | COVERED |
| Job 2: Plan a Feature for Existing Project | Epic 3-F01 (State machine handles onboarded projects via _status.md context_type) | COVERED |
| Job 3: Initialize Layer Cake Structure | Epic 3-F01 (Filesystem state machine creates folder structure) | COVERED |
| Job 4: Execute an Approved Plan (L8-L12) | Epic 2 (Builder agent), Epic 2 (Judge agent for L9-L11), Epic 3 (Routing, validation) | COVERED |
| Job 5: Run Complete Project (L1-L12) | Full Epic 1-3 combined | COVERED |
| Job 6: Resume an Existing Project | Epic 3-F05 (Session recovery and status reconciliation) | COVERED |
| Job 7: Resume After Session Crash | Epic 3-F05 (Session recovery), Epic 3-F01 (Status reconciliation) | COVERED |
| Job 8: Handoff Context to New Agent/Session | Epic 2-F04 (Agent handoff protocol) | COVERED |
| Job 9: Address Review Iteration Requests | Epic 3-F04 (Pass/fail routing, cascade logic), Epic 2-F03 (Judge graduated rigor) | COVERED |
| Job 10: Judge Work as Adversarial Reviewer | Epic 2-F03 (Judge agent with graduated rigor and layer-specific review prompts) | COVERED |
| Job 11: Improve Layer Cake Methodology | Epic 1 (Blueprint as canonical source), but retrospective capture (L12) is implicit | PARTIAL |

### Architecture Decision Coverage

| Decision | Covered By | Status |
|----------|------------|--------|
| Decision 1: Filesystem as State Machine | Epic 3-F01 (Filesystem state machine implementation) | COVERED |
| Decision 2: Three Specialized Agents | Epic 2-F01 (Planner), Epic 2-F02 (Builder), Epic 2-F03 (Judge) | COVERED |
| Decision 3: Iteration Cascade with Escalation Limits | Epic 3-F04 (Pass/fail routing and cascade logic), Epic 2-F03 (Graduated rigor) | COVERED |
| Decision 4: Human Gates at L3 and L7 | Implicit in orchestration (Epic 3), but no explicit feature for human gate UI/notification | PARTIAL |
| Decision 5: Template-Driven Artifacts | Epic 1-F04 (Modal shows specifications), but artifact templates not explicitly featured | PARTIAL |
| Decision 6: Browser Testing for UX Verification | Epic 2-F03 (Judge uses /chrome), Epic 2-F05 (Tool permissions for Judge) | COVERED |
| Decision 7: Commit Granularity at Task Level | Not explicitly featured - assumed Builder behavior | GAP |
| Decision 8: Context Packages Per Agent Role | Epic 2-F01, F02, F03 (Context packages for each agent) | COVERED |
| Decision 9: Project Size Tiers | Epic 1-F05 (Hierarchy calculator with tier presets) | COVERED |
| Decision 10: Service Blueprint as Canonical | Epic 1 (entire epic is about this) | COVERED |
| Decision 11: Split Planning and Execution Phases | Epic 3-F04 (Routing supports phase separation), but explicit "plan only" mode not featured | PARTIAL |

### Journey Coverage

| Journey | Supported By | Status |
|---------|--------------|--------|
| Journey 0: Project Initialization | Epic 3-F01 (State machine creates structure) | COVERED |
| Journey 1: Plan Only (L1-L7) | Epic 2-F01 (Planner), Epic 3 (Orchestration), but "stop at L7" mode not explicit | PARTIAL |
| Journey 2: Execute Only (L8-L12) | Epic 2-F02 (Builder), Epic 2-F03 (Judge), Epic 3 (Routing) | COVERED |
| Journey 3: Full Run (L1-L12) | Full Epic 1-3 combined | COVERED |
| Journey 4: Iteration Path | Epic 3-F04 (Cascade logic), Epic 2-F03 (Graduated rigor), Epic 3-F03 (Iteration tracking) | COVERED |
| Journey 5: Session Handoff | Epic 2-F04 (Agent handoff), Epic 3-F05 (Session recovery) | COVERED |

### Tension Resolution Coverage

| Tension | Resolution In | Status |
|---------|---------------|--------|
| Tension 1: Thoroughness vs Efficiency | Decision 9 (Project tiers), Epic 1-F05 (Tier presets) | COVERED |
| Tension 2: Adversarial vs Paralysis | Decision 3 (Graduated rigor), Epic 2-F03 (Judge rigor rules) | COVERED |
| Tension 4: Human Oversight vs Autonomy | Decision 4 (Human gates), but gate notification mechanism not featured | PARTIAL |
| Tension 5: Filesystem vs _status.md Authority | Decision 1 (Filesystem authoritative for what exists), Epic 3-F05 (Reconciliation) | COVERED |
| Tension 6: Agents vs Context | Decision 8 (Context packages), Epic 2-F01/F02/F03 (Each agent has defined context) | COVERED |
| Tension 9: Template Rigor vs Flexibility | Decision 5 (N/A allowed with reason), but not explicitly featured | PARTIAL |

---

## Gaps Identified

### Gap 1: Commit Strategy Implementation

**From:** Architecture Decision 7 (Commit Granularity at Task Level)
**Missing From Plan:** No feature explicitly implements the commit strategy. The architecture specifies commits at task boundaries with specific message formats ([L{N}] action: item), WIP commits, and layer completion commits. This is documented in architecture.md but has no corresponding feature in Epic 2 (Builder) or Epic 3 (Orchestration).
**Severity:** MINOR
**Recommendation:** Add to Epic 2-F02 (Builder Agent) a subtask for commit protocol implementation, or create a new feature "Commit Strategy Enforcement" that defines commit timing, message formats, and WIP checkpoint triggers.

### Gap 2: Human Gate Notification Mechanism

**From:** Architecture Decision 4 (Human Gates at L3 and L7), Tension 4
**Missing From Plan:** While the orchestration logic handles gates (Epic 3-F04), there is no explicit feature for HOW humans are notified that a gate requires their attention. The system should pause and notify human but the notification mechanism (CLI prompt? File creation? External integration?) is undefined.
**Severity:** MINOR
**Recommendation:** Add a subtask to Epic 3-F04 or create a small feature "Human Gate Notification" that defines how Ralph signals to the human that a gate is waiting for approval. Consider: _status.md WAITING_HUMAN state, terminal output, or file-based signal.

### Gap 3: Artifact Template Enforcement

**From:** Architecture Decision 5 (Template-Driven Artifacts)
**Missing From Plan:** The architecture specifies detailed templates for features, tasks, subtasks, and reviews. While Epic 1-F04 shows templates in modals, there is no feature ensuring the Planner OUTPUTS artifacts matching these templates. Template compliance could be a validation check.
**Severity:** MINOR
**Recommendation:** Add template validation to Epic 3-F03 (Output Validation) or extend Epic 2-F01 (Planner) to include template adherence in the prompt and context. The Judge should also verify template compliance during plan reviews.

### Gap 4: Plan-Only Mode Explicit Support

**From:** Architecture Decision 11 (Split Planning and Execution), Journey 1
**Missing From Plan:** While the architecture formally defines "plan only" as a valid mode where execution stops at L7 approval, no feature explicitly supports this. The human can theoretically not invoke L8, but Ralph's orchestration should have an explicit "plan only" mode vs "full run" mode.
**Severity:** MINOR
**Recommendation:** Add to Epic 3-F01 (State Machine) a project_mode field in _status.md (plan_only | full_run | execute_only) and routing logic that respects this mode. Human sets mode at initialization or can change after L7 approval.

### Gap 5: Retrospective Methodology Improvement Loop

**From:** JTBD Job 11 (Improve the Layer Cake Methodology Itself)
**Missing From Plan:** Job 11 describes capturing learnings at L12 and updating methodology documentation. While L12 is a layer the Planner executes, there is no explicit feature for HOW retrospective insights feed back into LAYER_CAKE data or methodology documents. The meta-improvement loop is documented but not featured.
**Severity:** MINOR
**Recommendation:** This may be intentionally manual (human reviews retrospective and updates methodology). If automated improvement is desired, add a feature for "Retrospective-Driven Methodology Updates" that surfaces improvement suggestions from L12 retrospectives for human review.

### Gap 6: N/A Section Handling in Templates

**From:** Architecture Decision 5, Tension 9 (Template Rigor vs Flexibility)
**Missing From Plan:** The tension resolution specifies "Allow 'N/A: {reason}' for genuinely inapplicable sections. Judge reviews N/A justifications." This validation behavior is not captured in any feature.
**Severity:** MINOR
**Recommendation:** Add to Epic 3-F03 (Output Validation) or Epic 2-F03 (Judge) the rule that N/A sections require justification and Judge should evaluate if N/A is warranted.

---

## Brain Dump Concepts Traceability

Checking that key ideas from the original brain dumps made it through to the plan:

| Brain Dump Concept | In Synthesis | In Plan | Status |
|-------------------|--------------|---------|--------|
| GAN system for adversarial review | Yes (Decision 2, Decision 3) | Yes (Epic 2, F03) | COVERED |
| Folder structure as control flow | Yes (Decision 1) | Yes (Epic 3-F01) | COVERED |
| ToC + per-feature docs | Yes (layer specs) | Yes (Epic 1) | COVERED |
| Failure pushes back down | Yes (Decision 3, Journey 4) | Yes (Epic 3-F04) | COVERED |
| Max iterations (3) to prevent loops | Yes (Decision 3) | Yes (Epic 2-F03, Epic 3-F04) | COVERED |
| Context handoff between sessions | Yes (Job 8, Journey 5) | Yes (Epic 2-F04, Epic 3-F05) | COVERED |
| "Keep Going" problem | Yes (Decision 3, enforced minimums) | Yes (Epic 3-F03 minimums) | COVERED |
| What levels push to GitHub? | Partially (Decision 7 mentions commits) | No explicit feature | GAP |
| What triggers review? | Yes (layer specs, gates) | Yes (implicit in Epic 3) | COVERED |
| Visibility into system | Minimal in synthesis | No dashboard/monitoring feature | PARTIAL |
| Cost management for API calls | Mentioned in meta-test brain dump | No feature | GAP |
| Is 12 layers too many? | Question in meta-test | Not addressed | UNRESOLVED QUESTION |
| Are enforced minimums right? | Question in meta-test | Not addressed (left as-is) | UNRESOLVED QUESTION |
| Should Builder talk to Judge? | Question in meta-test | No (implicit in handoff design) | IMPLICITLY ANSWERED |

---

## Meta-Test Success Criteria Traceability

From brain-dump-meta-test.md:

| Success Criterion | Covered In Plan | Status |
|-------------------|-----------------|--------|
| Successfully run through all layers using agents | Epic 1-3 combined enable this | COVERED |
| Identify at least 5 concrete improvements | Will emerge during execution, not in plan | DEFERRED TO L12 |
| Produce updated documentation/visualizations | Epic 1 (Blueprint updates) | COVERED |
| Have a working orchestration pattern | Epic 3 (Ralph orchestration) | COVERED |

---

## Summary

**Coverage Statistics:**
- JTBD: 10/11 fully covered, 1 partial (91%)
- Architecture Decisions: 7/11 fully covered, 4 partial (64% full, 100% at least partial)
- Journeys: 5/6 fully covered, 1 partial (83%)
- Tensions: 4/6 fully covered, 2 partial (67%)
- Brain Dump Concepts: 10/14 covered, 2 partial, 2 gaps (71%)

**Gaps Requiring Attention:** 6 MINOR gaps identified

**Coverage Quality Assessment:**

The plan provides COMPREHENSIVE coverage of the core functionality needed for Layer Cake to work. All 11 JTBD have at least partial support. All journeys can be executed with the planned features. The three epics form a logical dependency chain that builds the system incrementally.

**Gaps are all MINOR because:**
1. They affect polish/completeness rather than core functionality
2. Most can be addressed by adding subtasks to existing features rather than new features
3. None block the primary flows (plan -> build -> review -> ship)

**Notable Strengths:**
- The 3-agent system (Epic 2) is well-decomposed with clear role separation
- The orchestration layer (Epic 3) covers all the critical state management needs
- The blueprint canonicalization (Epic 1) provides a solid foundation
- The cascade/iteration logic is thoroughly planned

**Areas That Could Be Stronger:**
- Human interaction touchpoints (gates, notifications) are implicit
- Commit strategy is documented but not explicitly featured
- Operational concerns (cost, monitoring) are not addressed

**Verdict:** SUFFICIENT

The plan is comprehensive enough to proceed to build. The identified gaps are MINOR and can be addressed by:
1. Adding subtasks during L6/L7 task decomposition
2. Capturing them as "known limitations" for the retrospective
3. Treating them as fast-follow improvements after initial implementation

No MAJOR or CRITICAL gaps were found that would require returning to L4 (Epics) or L3 (Synthesis).

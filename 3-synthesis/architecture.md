# Architecture Decision Records

Key technical decisions for the Layer Cake system.

---

## Decision 1: Filesystem as State Machine

**Status:** Accepted

**Context:**
Layer Cake needs to track progress through 12 layers, maintain position within each layer, and survive session crashes. Traditional approaches use databases or in-memory state, but Claude sessions are ephemeral and don't have persistent storage access beyond the filesystem.

**Decision:**
Use the project folder structure as the primary state machine:
- Folder existence indicates layer completion
- File existence indicates artifact completion
- `_status.md` provides explicit current position
- Git commits create checkpoint history

**Folder Structure:**
```
project-root/
  1-input/
  2-decomposition/
  3-synthesis/
  4-epics/
  5-features/
  6-tasks/
  7-subtasks/
  8-build/          # (code lives in main project tree)
  9-reviews/
  10-reviews/
  11-reviews/
  12-retrospective/
  _status.md        # Current position
```

**Consequences:**
- (+) Human-readable and inspectable at any time
- (+) Git-compatible for version control and collaboration
- (+) Survives session crashes automatically
- (+) No external dependencies (databases, servers)
- (-) Slightly slower than in-memory state
- (-) Possible drift between _status.md and folder contents
- (-) Requires reconciliation logic on resume

**Resolution of Tension 5 (Filesystem vs _status.md):**
- Folder structure is authoritative for *what exists*
- _status.md is authoritative for *where we are*
- On session start, validate _status.md against folders and reconcile if needed

---

## Decision 2: Three Specialized Agents

**Status:** Accepted

**Context:**
The GAN concept requires separation between creation and critique. A single agent reviewing its own work has inherent bias. The system also has distinct phases (planning, building, reviewing) with different tool needs and cognitive modes.

**Decision:**
Implement three distinct agent personas with different capabilities:

| Agent | Layers | Tools | Mode |
|-------|--------|-------|------|
| **Planner** | L1-L7, L12 | Read, Glob, Grep, Write | Plan mode |
| **Builder** | L8 | Read, Write, Edit, Bash | Accept edits |
| **Judge** | Plan reviews, L9-L11 | Read, Glob, Grep, Bash | Default (no write) |

**Agent Characteristics:**
- **Planner**: Thorough decomposition, minimum counts enforced, creates specs
- **Builder**: Precise implementation, follows spec exactly, no improvisation
- **Judge**: Rigorous mindset, default to requesting iteration when issues found, cannot modify code

**Consequences:**
- (+) Prevents self-review bias
- (+) Each agent optimized for its role
- (+) Clear handoff points between agents
- (-) Context duplication between agents
- (-) Orchestration complexity
- (-) Additional API calls for agent transitions

---

## Decision 3: Iteration Cascade with Escalation Limits

**Status:** Accepted

**Context:**
When the Judge requests iteration on work, the system needs to route back to the appropriate layer for refinement. Without limits, this could loop indefinitely. Without clear routing, refinements might be applied at the wrong level.

**Philosophy:**
Iteration requests are not failures - they're the system working as designed. The review process exists to prompt deeper thinking. Each iteration cycle improves the work quality.

**Decision:**
Implement a tiered cascade system:

| Iteration Type | Definition | Route To |
|----------------|-----------|----------|
| **MINOR** | Implementation refinement needed, spec is correct | L8 (Build) |
| **MAJOR** | Spec needs updating, approach is correct | L5/L6 (Spec layer) |
| **ESCALATE** | Fundamental approach needs rethinking | L4 or earlier |

**Iteration Limits:**
- Max 3 iterations per layer before automatic escalation
- Each escalation goes back 2+ layers
- Human notification on escalation

**Graduated Rigor:**
- Iteration 1: Comprehensive - identify all areas for improvement
- Iteration 2: Focused - prioritize blockers and significant issues
- Iteration 3: Pragmatic - must-haves only
- After 3: Human decides next steps

**Context Preservation:**
- _status.md tracks iteration count and context
- Issues from previous iteration are recorded
- What was addressed vs. what remains is clear
- Handoff to next iteration includes full history

**Consequences:**
- (+) Prevents infinite loops
- (+) Appropriate refinements at appropriate levels
- (+) Human oversight on persistent issues
- (+) Each iteration improves work quality
- (-) Requires clear MINOR/MAJOR classification
- (-) May need to revisit earlier work on escalation
- (-) Human becomes decision point on complex issues

**Resolution of Tension 2 (Adversarial vs Paralysis):**
Graduated rigor ensures early iterations catch issues comprehensively while later iterations focus on what's essential to proceed.

---

## Decision 4: Human Gates at L3 and L7

**Status:** Accepted

**Context:**
The system should be autonomous but not unsupervised. Humans need checkpoints to verify direction before significant investment. Too many gates slow progress; too few risk going far down wrong paths.

**Decision:**
Two mandatory human gates:

| Gate | Layer | Purpose |
|------|-------|---------|
| **Understanding Gate** | L3 (Synthesis) | Confirm AI understood the problem correctly |
| **Plan Gate** | L7 (Subtasks) | Approve full plan before any code is written |

**Gate Behavior:**
- System pauses and notifies human
- Human reviews artifacts and provides APPROVE or REVISE
- REVISE sends back to previous layer with feedback
- Cannot proceed until human approves

**Phase Separation:**
- L7 gate serves as the boundary between Planning Phase and Execution Phase
- Human can approve at L7 and choose to stop (plan only)
- Human can approve at L7 and proceed to execution
- This enables "Plan Only" and "Execute Only" workflows

**Consequences:**
- (+) Catches misunderstandings before detailed planning
- (+) Catches bad plans before any code is written
- (+) Human stays informed without constant attention
- (+) Enables separation of planning from execution
- (-) Blocks autonomous progress at two points
- (-) Human availability becomes a bottleneck
- (-) May need to wait hours/days for approval

**Future Consideration (from Tension 4):**
- Could implement tiered gating (hard/soft/auto-approve) based on project risk
- Could allow async gates where work continues speculatively

---

## Decision 5: Template-Driven Artifacts

**Status:** Accepted

**Context:**
Consistency across artifacts enables automation, review, and handoff. Without structure, each layer's output varies and downstream processing becomes fragile.

**Decision:**
Every artifact type has a defined template with required sections:

**Feature Template:**
```markdown
# Feature: {name}

## Overview
{description}

## User Value
{why users care}

## Requirements (5+ items)
1. {requirement}
...

## Technical Approach
{implementation strategy}

## Tasks (3+ items)
- [ ] {task reference}
...

## Acceptance Criteria
- [ ] {criterion}
...

## Edge Cases
- {edge case handling}
```

**Review Template:**
```markdown
# Review: {layer} - {item}

## Verdict: PASS | ITERATE

## Checklist
- [ ] All acceptance criteria verified
- [ ] Tests passing
- [ ] No regressions
...

## Areas for Improvement (if ITERATE)
### Item 1
- Type: MINOR | MAJOR
- Description: {what needs refinement}
- Location: {file:line}
- Suggested approach: {how to address}

## Cascade Decision (if ITERATE)
Return to: L{N}
Reason: {why this layer}
Iteration: {N} of 3
```

**Consequences:**
- (+) Consistent structure enables automation
- (+) Checklists prevent forgotten items
- (+) Templates reduce cognitive load
- (+) Easy to validate completeness
- (-) May feel rigid for unusual situations
- (-) Template updates require retrofitting

**Resolution of Tension 9 (Template Rigor vs Flexibility):**
Allow "N/A: {reason}" for genuinely inapplicable sections. Judge reviews N/A justifications.

---

## Decision 6: Browser Testing for UX Verification

**Status:** Accepted

**Context:**
Automated tests verify functional correctness but miss UX issues. Code that passes tests may still be confusing, ugly, or difficult to use. The verification gap identified in the brain dump specifically calls this out.

**Decision:**
The Judge uses /chrome (browser automation) to manually test UI features:

**Testing Protocol:**
1. Navigate to the feature in browser
2. Test each acceptance criterion interactively
3. Try edge cases (empty inputs, errors, etc.)
4. Assess subjective quality ("Does this feel right?")

**What Browser Testing Catches:**
- Visual bugs not in tests
- UX friction (too many clicks, confusing flow)
- Responsiveness issues
- Accessibility problems
- "Taste" issues that functional tests miss

**Consequences:**
- (+) Catches real UX issues
- (+) Forces "use the product" mindset
- (+) Finds bugs automated tests miss
- (-) Slower than automated testing
- (-) Requires /chrome MCP capability
- (-) Subjective assessments may vary

---

## Decision 7: Commit Granularity at Task Level

**Status:** Accepted

**Context:**
Git commits serve as checkpoints for resume and as documentation of progress. Too granular (per subtask) clutters history. Too coarse (per epic) loses resume points.

**Decision:**
Commit at task boundaries:

| When | Commit Style |
|------|--------------|
| During L8 build | One commit per completed task |
| WIP checkpoint | `[WIP] Layer X: working on {item}` |
| Layer completion | Clean commit summarizing layer |
| Review result | `[REVIEW] L{N}: PASS` or `ITERATE - {summary}` |
| Ship | Tag release: `v{version}` |

**Commit Message Format:**
```
[L{N}] {action}: {item}

{details if needed}

---
Layer: {layer_name}
Chunk: {chunk}
Item: {item}
```

**Consequences:**
- (+) Clean history at task level
- (+) WIP commits enable resume
- (+) Easy to see progress in git log
- (-) May need to squash WIP commits later
- (-) Commit discipline required

---

## Decision 8: Context Packages Per Agent Role

**Status:** Accepted

**Context:**
Each agent needs context to do its job, but full project context wastes tokens and may confuse focus. Different roles need different information.

**Decision:**
Define minimal context packages per role:

| Role | Context Package |
|------|----------------|
| **Planner (L1-3)** | All input files, no code |
| **Planner (L4-7)** | Synthesis outputs, current layer specs |
| **Builder** | Current task spec, referenced code files only |
| **Judge (plan)** | Spec being reviewed, requirements it should meet |
| **Judge (build)** | Feature spec, implementation diff, test output |

**Excluded From All:**
- Full git history
- Unrelated feature code
- Previous project artifacts (unless referenced)

**Consequences:**
- (+) Efficient token usage
- (+) Focused attention per role
- (+) Faster context loading
- (-) May miss relevant context occasionally
- (-) Requires smart context selection logic

**Resolution of Tension 6 (Agents vs Context):**
Explicit context packages prevent "give everyone everything" waste while ensuring each role has what it needs.

---

## Decision 9: Project Size Tiers with Adjusted Minimums

**Status:** Accepted

**Context:**
Enforced minimums (3+ epics, 3+ features, etc.) force thoroughness but may be excessive for small tasks or insufficient for large projects. One size doesn't fit all.

**Decision:**
Define project tiers with adjusted minimums:

| Tier | Epics | Features/Epic | Tasks/Feature | Subtasks/Task | Total Subtasks |
|------|-------|---------------|---------------|---------------|----------------|
| **Micro** | 1 | 2 | 2 | 1 | 4 |
| **Small** | 3 | 3 | 3 | 2 | 54 |
| **Medium** | 4 | 4 | 4 | 2 | 128 |
| **Large** | 5+ | 5+ | 5+ | 3 | 375+ |

**Tier Selection:**
- Human indicates tier in brain dump, or
- Planner proposes tier at L4, human confirms

**Consequences:**
- (+) Right-sized process for right-sized projects
- (+) Quick fixes don't need full ceremony
- (+) Large projects get adequate decomposition
- (-) Adds decision point for tier selection
- (-) Temptation to under-estimate tier

**Resolution of Tension 1 (Thoroughness vs Efficiency):**
Tiered approach allows efficiency for simple tasks while maintaining rigor for complex ones.

---

## Decision 10: Service Blueprint as Canonical Methodology Visualization

**Status:** Accepted

**Context:**
The Layer Cake methodology exists across multiple documents: JTBD, journeys, this architecture file, and the original HTML visualization. Without a single authoritative representation, the methodology can drift between documents, creating inconsistency.

**Decision:**
The service blueprint visualization (as implemented in `v3-system-blueprint.html`) is THE canonical representation of the methodology:

**Blueprint Structure:**
- **Swimlanes**: Horizontal rows representing actors (Human, Ralph Start, Planner, Builder, Judge, Ralph Check)
- **Columns**: Each of the 12 layers (L1-L12)
- **Cells**: Activities at the intersection of actor and layer
- **Data Source**: The `LAYER_CAKE` JavaScript object is the single source of truth

**Canonical Mapping:**
| Blueprint Element | Maps To |
|-------------------|---------|
| Layer columns | Layer specifications (layer-specifications.md) |
| Swimlane rows | Actor definitions |
| Cell activities | Layer actions and outputs |
| Pass/Fail arrows | Cascade rules |
| Human gate cells | L3 and L7 approval points |

**How to Use for Methodology Thinking:**
1. View the blueprint to understand the full system at a glance
2. Click any layer cell to see detailed specifications
3. Trace flows across swimlanes to understand handoffs
4. Use the hierarchy calculator to see decomposition math
5. Export LAYER_CAKE JSON for programmatic use

**Consequences:**
- (+) Single visual source of truth
- (+) Interactive exploration of methodology
- (+) Changes to methodology = changes to blueprint
- (+) Can be used by Ralph itself for self-reference
- (-) Requires HTML/JS environment to view
- (-) Markdown docs must stay in sync with blueprint

**Sync Protocol:**
When methodology changes:
1. Update `LAYER_CAKE` object in HTML first
2. Update markdown synthesis docs to match
3. Verify consistency via visual review

See `service-blueprint-spec.md` for full blueprint specification.

---

## Decision 11: Split Planning and Execution Phases

**Status:** Accepted

**Context:**
The original Layer Cake design assumed a continuous L1-L12 flow. However, real usage patterns show value in separating these phases:
- Teams may want to plan without committing to build
- Plans may be handed off to different teams or sessions
- Budget/resource decisions may depend on seeing the full plan first

**Decision:**
Formally split the methodology into two phases that can run independently:

**Planning Phase (L1-L7):**
- Generates the full decomposition and specifications
- Outputs: folder structure, all spec files, approved plan
- Ends with L7 human gate (plan approval)
- Can stop here - "just plan, don't build yet"
- Works for both NEW and EXISTING projects

**Execution Phase (L8-L12):**
- Takes an approved plan and builds it
- Prerequisite: L7 approved (plan exists and approved)
- Outputs: code, reviews, retrospective
- Can be run on a plan generated in a different session
- Works for both NEW and EXISTING projects

**Phase Boundary:**
```
L1-L7 (Planning) --[L7 GATE]--> L8-L12 (Execution)
                        |
                   Can stop here
                   Plan is complete
                   Hand off allowed
```

**Jobs to Be Done (updated):**
- "Plan a New Project" (L1-L7 only)
- "Plan a Feature for Existing Project" (L1-L7 only)
- "Execute an Approved Plan" (L8-L12 only)
- "Run Complete Project" (L1-L12 full flow)

**Consequences:**
- (+) Flexibility in workflow
- (+) Enables plan review without execution commitment
- (+) Allows handoff between teams/sessions
- (+) Budget decisions can be made after seeing full plan
- (-) Slightly more complex state tracking
- (-) Must ensure L7 approval state is preserved

---

## Summary

| Decision | Core Tradeoff | Status |
|----------|--------------|--------|
| 1. Filesystem State | Simplicity vs Speed | Accepted |
| 2. Three Agents | Separation vs Overhead | Accepted |
| 3. Iteration Cascade | Quality vs Loops | Accepted |
| 4. Human Gates | Oversight vs Speed | Accepted |
| 5. Template Artifacts | Consistency vs Flexibility | Accepted |
| 6. Browser Testing | UX Quality vs Time | Accepted |
| 7. Task Commits | Granularity vs Clutter | Accepted |
| 8. Context Packages | Focus vs Completeness | Accepted |
| 9. Project Tiers | Efficiency vs Rigor | Accepted |
| 10. Service Blueprint | Visual Source of Truth | Accepted |
| 11. Split Phases | Flexibility vs Complexity | Accepted |

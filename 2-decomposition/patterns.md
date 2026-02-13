# Recurring Patterns

Patterns identified across the Layer Cake input documents.

---

## Pattern 1: Nested Decomposition as Quality Forcing Function

**Appears in:**
- `00-brain-dump.md` (Layer Cake approach, lines 25-38)
- `01-architecture.md` (Layer structure, lines 11-74)
- `02-layer-specs.md` (Enforced minimums, lines 701-716)
- `v3-system-blueprint.html` (Hierarchy section)

**Description:**
The system uses hierarchical nesting (Epic > Feature > Task > Subtask) with enforced minimum counts at each level. This is not just organization - it is a forcing function that ensures thoroughness by requiring the planner to think deeply about each level before proceeding.

**Evidence:**
- "More layers of generation = more code, more thought, more thoroughness"
- "Minimum counts are enforced. More nesting = more thinking = more thorough output."
- Small project = 3 epics x 3 features x 3 tasks x 2 subtasks = 54 minimum subtasks

**Implication:**
The minimums should be tuned based on experience. Too low = insufficient decomposition. Too high = analysis paralysis.

---

## Pattern 2: Adversarial Review as Quality Gate

**Appears in:**
- `00-brain-dump.md` (GAN system concept, line 17)
- `01-architecture.md` (GAN reviewer, lines 254-290)
- `04-gan-reviewer.md` (Entire document)
- `layer-cake-judge.md` (Agent definition)
- `v3-system-blueprint.html` (GAN flow section)

**Description:**
A separate "critic" agent (the Judge/GAN) reviews all work with an adversarial mindset. The reviewer must act as if they didn't build it, find problems actively, and default to FAIL when uncertain.

**Evidence:**
- "You are the ADVERSARY, not the friend"
- "Assume there are bugs until proven otherwise"
- "When in doubt, FAIL - better to iterate than ship broken"

**Implication:**
The adversarial dynamic creates tension that drives quality, but needs calibration to prevent endless loops.

---

## Pattern 3: Filesystem as State Machine

**Appears in:**
- `00-brain-dump.md` (Folder structure as state machine, lines 58-73)
- `01-architecture.md` (Folder structure, lines 77-113)
- `03-session-management.md` (_status.md as source of truth, lines 19-75)

**Description:**
The folder structure IS the workflow. Current position, completed work, and pending items are all encoded in the filesystem. `_status.md` provides explicit state tracking, but the folder contents are authoritative.

**Evidence:**
- "Folder structure can BE the control flow / loop mechanism"
- "`_status.md` is the source of truth for position"
- "Trust folder structure over _status.md" (in conflict resolution)

**Implication:**
This enables session recovery and human visibility without complex database state management.

---

## Pattern 4: Fail Cascade with Escalation Limits

**Appears in:**
- `00-brain-dump.md` (Failure handling, lines 42-46)
- `01-architecture.md` (Failure & re-planning, lines 153-177)
- `04-gan-reviewer.md` (Iteration limits, lines 244-252)
- `layer-cake-judge.md` (Escalation rules, lines 170-174)
- `v3-system-blueprint.html` (Pass/Fail cascade section)

**Description:**
Failures cascade downward through the hierarchy. Minor issues stay at the same level, major issues go back one level, and repeated failures (3x) escalate to rethink the approach at a higher level. Max iterations prevent infinite loops.

**Evidence:**
- "MINOR issues: Return to Layer 6, fix specific items. MAJOR issues: Return to Layer 5"
- "Max iterations (3?) to prevent infinite loops"
- "3rd failure: Escalate one level up"

**Implication:**
The cascade rules need clear definitions of MINOR vs MAJOR, and the iteration limit prevents wasted resources on fundamentally broken approaches.

---

## Pattern 5: Separation of Concerns via Specialized Agents

**Appears in:**
- `layer-cake-planner.md` (Planner role)
- `layer-cake-builder.md` (Builder role)
- `layer-cake-judge.md` (Judge role)
- `v3-system-blueprint.html` (Actor definitions in LAYER_CAKE.actors)

**Description:**
Three distinct agents with specialized responsibilities:
1. **Planner** - Decomposes and plans (L1-L7, L12)
2. **Builder** - Implements code exactly per spec (L8)
3. **Judge** - Reviews adversarially (L9-L11, also plan reviews)

Each agent has different tools, models, and permission modes.

**Evidence:**
- Planner: "THOROUGH DECOMPOSITION" with Read, Glob, Grep, Write
- Builder: "PRECISE IMPLEMENTATION" with Read, Write, Edit, Bash
- Judge: "ADVERSARIAL REVIEW" with Read, Glob, Grep, Bash (no Write)

**Implication:**
The separation prevents self-review and ensures each role focuses on its core competency.

---

## Pattern 6: Explicit Handoff Protocols for Session Continuity

**Appears in:**
- `00-brain-dump.md` (Context handoff, lines 91-100)
- `01-architecture.md` (Context handoff, lines 180-217)
- `03-session-management.md` (Entire document)

**Description:**
When a Claude session ends or transitions, a structured handoff prompt provides the next session with: current position, completed work, relevant context, and next action. Commits serve as checkpoints that can be resumed from.

**Evidence:**
- "When starting a new Claude session, send this prompt..." with structured format
- "Every commit is a potential resume point"
- Session checkpoint includes: Layer, Position, Last commit, Next action

**Implication:**
Without explicit handoff, context is lost and work may be duplicated or inconsistent.

---

## Pattern 7: Human Gates at Critical Decision Points

**Appears in:**
- `01-architecture.md` (Human approval implied)
- `02-layer-specs.md` (Human gate at L3 and L7)
- `v3-system-blueprint.html` (humanGate: true on L3, L7)
- `brain-dump-meta-test.md` (Question about optimal placement)

**Description:**
Humans approve at two key points:
1. **L3 (Synthesis)** - After understanding is complete, before detailed planning
2. **L7 (Subtasks)** - After full plan is complete, before building starts

These gates ensure the AI hasn't gone off track before significant investment.

**Evidence:**
- L3: "humanGate: true" with "Optional human approval checkpoint"
- L7: "humanGate: true" with "Human Reviews Full Plan -> Approve to Build"

**Implication:**
Gate placement affects cost vs quality. Too early = incomplete info, too late = wasted work on wrong direction.

---

## Pattern 8: Chrome/Browser Testing for UX Verification

**Appears in:**
- `04-gan-reviewer.md` (Test via /chrome, lines 52-56)
- `v3-system-blueprint.html` (L9: "/chrome", Browser Automation tool)
- `layer-cake-judge.md` (Manual verification with /chrome)

**Description:**
Build reviews must actually test the feature in a browser, not just read code. The Judge uses /chrome to interact with the UI, test acceptance criteria, and assess UX quality.

**Evidence:**
- "USE the feature via /chrome - don't just read code"
- "If the feature has UI, USE /chrome: Navigate to the feature, Test EACH acceptance criterion, Try edge cases"

**Implication:**
This catches issues that pass automated tests but fail real user experience.

---

## Pattern 9: Template-Driven Consistency

**Appears in:**
- `01-architecture.md` (Commit message format, _status.md format)
- `02-layer-specs.md` (Epic, Feature, Task, Subtask templates)
- `04-gan-reviewer.md` (_review.md format)
- `layer-cake-planner.md` (Spec templates)
- `layer-cake-judge.md` (Review template)

**Description:**
All artifacts have defined templates that ensure consistent structure, completeness, and machine-readability. Templates include checklists and required sections.

**Evidence:**
- Feature template: Overview, User Value, Requirements (5+), Technical Approach, Tasks (3+), Acceptance Criteria, Edge Cases
- Review template: Verdict, Checklist, Issues Found, What Worked Well, Cascade Decision

**Implication:**
Templates reduce cognitive load and ensure nothing is forgotten.

---

## Pattern 10: Self-Check Checklists Before Completion

**Appears in:**
- `layer-cake-planner.md` (Self-check before finishing, lines 134-143)
- `layer-cake-builder.md` (Verification checklist, lines 77-86)
- `layer-cake-judge.md` (Self-check, lines 184-192)
- `04-gan-reviewer.md` (Review checklist template, lines 266-300)

**Description:**
Each agent has a checklist they must verify before declaring work complete. These prevent premature completion and ensure quality gates are actually enforced.

**Evidence:**
- Planner: "3+ epics? 3+ features per epic? ... If any check fails, expand the plan before finishing."
- Builder: "All subtasks marked [x]? Tests passing? Typecheck passing? Lint passing?"
- Judge: "Did I actually verify each criterion? Did I run automated checks (not assume)?"

**Implication:**
Self-checks create accountability and prevent lazy shortcuts.

---

## Summary

| Pattern | Core Insight | Risk if Missing |
|---------|-------------|-----------------|
| 1. Nested Decomposition | Depth forces thoroughness | Shallow, incomplete work |
| 2. Adversarial Review | Critic finds what builder misses | Quality blind spots |
| 3. Filesystem State | Recoverable, visible progress | Lost context, confusion |
| 4. Fail Cascade | Controlled regression prevents loops | Infinite retries or giving up |
| 5. Specialized Agents | Focus and separation of concerns | Self-review bias |
| 6. Handoff Protocols | Session continuity | Lost progress |
| 7. Human Gates | Strategic oversight | AI goes off track |
| 8. Browser Testing | Real UX verification | Functional but unusable |
| 9. Template Consistency | Completeness and predictability | Missing info, varied quality |
| 10. Self-Check Lists | Accountability before completion | Premature declarations |

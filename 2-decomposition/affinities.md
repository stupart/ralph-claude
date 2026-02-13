# Affinity Groups

Related concepts grouped by theme for synthesis.

---

## Group A: State and Progress Tracking

**Theme:** How the system knows where it is and what to do next

### Related Concepts
1. **_status.md** - Explicit state document with layer, chunk, item, iteration
2. **Folder structure** - Implicit state via file existence and organization
3. **Commit history** - Checkpoint trail in git
4. **Recent history** - Log of actions in _status.md

### Connections
- _status.md and folders should agree; if they disagree, trust folders
- Commits are checkpoints; _status.md is current position
- Session start reads _status.md to know where to resume
- Every state change should update _status.md

### Sources
- `03-session-management.md` (entire)
- `01-architecture.md:77-149`
- `00-brain-dump.md:58-84`

---

## Group B: Layered Decomposition

**Theme:** Breaking work into progressively smaller, more specific pieces

### Related Concepts
1. **Layers 1-7** - Input through Subtask specification
2. **Epic > Feature > Task > Subtask hierarchy**
3. **Enforced minimums** - 3+ epics, 3+ features/epic, etc.
4. **Progressive refinement** - Each layer adds specificity

### Connections
- Each layer has entry/exit criteria
- Minimums force thoroughness
- Can't skip layers; must complete each before proceeding
- Failure at any layer cascades down

### Sources
- `02-layer-specs.md` (entire)
- `00-brain-dump.md:25-38`
- `v3-system-blueprint.html:718-1064`

---

## Group C: Quality Assurance via GAN Review

**Theme:** Using adversarial review to catch problems

### Related Concepts
1. **GAN Reviewer/Judge** - Critic persona
2. **Plan reviews** - Are plans thorough and specific?
3. **Build reviews** - Does code work and match spec?
4. **_review.md** - Structured review output
5. **Pass/Fail verdicts** - Gates that block or allow progress

### Connections
- Planner produces -> Judge reviews -> Pass or rework
- Builder produces -> Judge reviews -> Pass or rework
- Judge cannot edit code; can only review and report
- Multiple review types: plan review (L3-L7), build review (L9-L11)

### Sources
- `04-gan-reviewer.md` (entire)
- `layer-cake-judge.md` (entire)
- `v3-system-blueprint.html:1067-1079`

---

## Group D: Failure Handling and Cascade

**Theme:** What happens when something fails review

### Related Concepts
1. **MINOR failures** - Code bug, stay at same level
2. **MAJOR failures** - Spec problem, go back one level
3. **ESCALATE** - After 3 failures, go back two+ levels
4. **Max iterations** - 3 attempts before escalation
5. **Cascade rules** - Which layer to return to based on severity

### Connections
- Prevents infinite loops with max iterations
- Gradual escalation encourages fixing vs giving up
- Clear routing based on issue type
- Human may need to intervene on escalation

### Sources
- `01-architecture.md:153-177`
- `04-gan-reviewer.md:186-252`
- `v3-system-blueprint.html:1074-1079`

---

## Group E: Agent Specialization

**Theme:** Different roles for different phases

### Related Concepts
1. **Planner** - Understands and decomposes (L1-L7, L12)
2. **Builder** - Implements exactly per spec (L8)
3. **Judge** - Reviews adversarially (plan reviews, L9-L11)
4. **Tool permissions** - Each agent has specific tools
5. **Permission modes** - default, acceptEdits, plan

### Connections
- Planner can Write but not Edit code
- Builder can Edit and Bash
- Judge cannot Write; can only Read and Bash (for tests)
- Separation prevents self-review bias

### Sources
- `layer-cake-planner.md`
- `layer-cake-builder.md`
- `layer-cake-judge.md`
- `v3-system-blueprint.html:670-706`

---

## Group F: Session Management and Handoff

**Theme:** Maintaining continuity across Claude sessions

### Related Concepts
1. **Handoff prompt** - Structured context for new session
2. **Context loading rules** - What to include per layer
3. **Checkpoint commits** - WIP saves before session end
4. **Resume protocol** - How to pick up where left off
5. **Error recovery** - What if _status.md is corrupted

### Connections
- Handoff prompt includes: status, relevant files, layer rules, task
- Different layers need different context loaded
- Commits enable any session to resume
- Folder structure is backup state if _status.md fails

### Sources
- `03-session-management.md` (entire)
- `01-architecture.md:180-217`

---

## Group G: Verification and Testing

**Theme:** How to know if work is actually complete and correct

### Related Concepts
1. **Acceptance criteria** - Defined per feature/task
2. **Automated tests** - npm test, typecheck, lint
3. **Browser testing** - /chrome for UX verification
4. **Checklists** - Self-check before completion
5. **Done criteria** - Per-layer completion requirements

### Connections
- Acceptance criteria set during planning, verified during review
- Automated tests catch regressions, browser testing catches UX issues
- Self-check ensures nothing forgotten before declaring done
- Done criteria prevent premature layer advancement

### Sources
- `02-layer-specs.md` (Done criteria per layer)
- `04-gan-reviewer.md:50-56, 269-300`
- `layer-cake-builder.md:77-86`

---

## Group H: Documentation and Artifacts

**Theme:** What gets produced at each stage

### Related Concepts
1. **Brain dumps** - Raw input (L1)
2. **Quotes/Patterns/Affinities** - Decomposition (L2)
3. **JTBD/Journeys/Architecture** - Synthesis (L3)
4. **epics.md** - Epic outline (L4)
5. **feature-*.md** - Feature specs (L5)
6. **_tasks.md, task-*.md** - Task/subtask specs (L6-L7)
7. **_review.md** - Review results (L9-L11)
8. **retrospective.md** - Final analysis (L12)

### Connections
- Each layer has defined output artifacts
- Artifacts live in numbered folders (1-input, 2-decomposition, etc.)
- Templates ensure consistency across artifacts
- Later layers reference earlier layer artifacts

### Sources
- `01-architecture.md:77-113`
- `02-layer-specs.md` (Artifacts sections)

---

## Group I: Human Interaction Points

**Theme:** Where and why humans are involved

### Related Concepts
1. **Human gates** - L3 and L7 approval checkpoints
2. **Brain dump input** - L1 human provides requirements
3. **Manual override** - Human can edit _status.md
4. **Conflict resolution** - Human decides when builder and judge disagree
5. **Final acceptance** - Human ships the result

### Connections
- Gates prevent AI from going far down wrong path
- L3 gate: confirm understanding before detailed planning
- L7 gate: approve full plan before building
- Human is ultimate arbiter of quality

### Sources
- `v3-system-blueprint.html:1067-1071`
- `03-session-management.md:229-237`
- `04-gan-reviewer.md:305-312`

---

## Group J: Open Questions and Meta-Concerns

**Theme:** Unresolved design decisions and areas for improvement

### Related Concepts
1. **Layer count** - Is 12 too many?
2. **Minimum calibration** - Are 3+ epics, etc. the right numbers?
3. **Gate placement** - Are L3 and L7 optimal?
4. **Agent communication** - Should Builder talk to Judge directly?
5. **Cost management** - Reviews add API calls
6. **Context limits** - How much can each agent hold?
7. **Orchestration patterns** - How does Ralph spawn agents?

### Connections
- Meta-test aims to answer these questions through experience
- All affect complexity vs quality tradeoff
- Need real usage data to calibrate properly
- Methodology should improve itself (retrospective)

### Sources
- `brain-dump-meta-test.md:27-43, 57-60`
- `05-implementation-plan.md:360-383`

---

## Cross-Group Relationships

```
A (State) <---> B (Layers)
   |               |
   v               v
F (Sessions) <---> E (Agents)
   |               |
   v               v
H (Artifacts) <---> C (Reviews)
   |               |
   v               v
G (Verification) <---> D (Failures)
   |               |
   v               v
I (Humans) <---> J (Questions)
```

**Key Insight:** Everything connects to everything. The Layer Cake is a tightly integrated system where:
- State tracking (A) enables layer navigation (B)
- Sessions (F) are staffed by specialized agents (E)
- Agents produce artifacts (H) that get reviewed (C)
- Reviews use verification (G) and route failures (D)
- Humans (I) oversee the whole system and answer open questions (J)

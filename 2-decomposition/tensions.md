# Tensions and Contradictions

Identified conflicts that need resolution in the Layer Cake system.

---

## Tension 1: Thoroughness vs. Efficiency

**The Conflict:**
- More layers and enforced minimums = more thorough output
- More layers and minimums = more time, more API calls, more cost

**Evidence:**
- "More layers of generation = more code, more thought, more thoroughness" (`00-brain-dump.md:20`)
- "Cost management - reviews add API calls" (`brain-dump-meta-test.md:40`)
- Small project minimum = 54 subtasks. Medium = 240 subtasks.

**Resolution Needed:**
- When is the overhead worth it?
- Should there be a "fast mode" that skips some layers for trivial tasks?
- How do we measure ROI on additional layers?

**Recommendation:**
Consider project size tiers with different minimum counts:
- Micro: 2 features, 2 tasks, 1 subtask (quick fixes)
- Small: 3/3/2 (current defaults)
- Large: 5/5/3 (enterprise features)

---

## Tension 2: Adversarial Review vs. Analysis Paralysis

**The Conflict:**
- Judge should be aggressive and "find problems" with default-to-FAIL
- But this can create infinite loops or demoralize the workflow

**Evidence:**
- "When in doubt, FAIL - better to iterate than ship broken" (`04-gan-reviewer.md:64`)
- "Don't get stuck in analysis paralysis" (`brain-dump-meta-test.md:54`)
- "How aggressive should the Judge be?" (`brain-dump-meta-test.md:34`)
- "Should there be a 'mercy rule' after N failures?" (`brain-dump-meta-test.md:37`)

**Resolution Needed:**
- What's the right failure rate? 50%? 30%?
- Should aggression decrease after multiple iterations?
- When does the Judge say "good enough"?

**Recommendation:**
Implement graduated aggression:
- Iteration 1: Strict (find all issues)
- Iteration 2: Moderate (focus on blockers)
- Iteration 3: Pragmatic (must-haves only)
- After 3: Human decides

---

## Tension 3: Spec Fidelity vs. Builder Judgment

**The Conflict:**
- Builder should follow spec "EXACTLY as written. No more, no less."
- But specs may have gaps, errors, or unclear instructions

**Evidence:**
- Builder: "DO NOT: Add features not in the spec, Refactor code outside the spec scope, 'Improve' things you notice along the way" (`layer-cake-builder.md:59-62`)
- Builder: "When Stuck: Spec is ambiguous or unclear... You think the spec has an error... DO NOT guess or improvise" (`layer-cake-builder.md:68-75`)

**Resolution Needed:**
- How does Builder report spec issues without blocking entirely?
- What if Builder sees an obvious bug not in spec?
- Is there a "obvious improvement" exception?

**Recommendation:**
Add a "Builder Notes" section in task completion report:
- Builder flags potential issues for Judge review
- Judge can approve small deviations or create new tasks
- Critical safety issues can be fixed with explicit note

---

## Tension 4: Human Gate Placement vs. Workflow Speed

**The Conflict:**
- Human gates (L3, L7) ensure oversight and prevent wrong directions
- But waiting for human approval blocks autonomous progress

**Evidence:**
- "Human gates at L3 and L7" (`v3-system-blueprint.html:1067-1071`)
- "Is the human gate at L3 and L7 optimal?" (`brain-dump-meta-test.md:59`)
- The whole point is to be more autonomous than current Ralph

**Resolution Needed:**
- Can human gates be optional for trusted patterns?
- Should gates be async (human reviews while work continues)?
- What about "auto-approve if confidence is high"?

**Recommendation:**
Implement tiered gating:
- New project / risky changes: Hard gates required
- Known patterns / low risk: Soft gates (async notification)
- Trusted context: Auto-approve with human review post-facto

---

## Tension 5: Filesystem State vs. _status.md

**The Conflict:**
- _status.md is "source of truth for position"
- But "Trust folder structure over _status.md" in conflict resolution

**Evidence:**
- "`_status.md` is the source of truth for position" (`03-session-management.md:19`)
- "Trust folder structure over _status.md" (`03-session-management.md:269-271`)

**Resolution Needed:**
- Which is actually authoritative?
- How do we prevent divergence?
- What triggers reconciliation?

**Recommendation:**
Clarify the hierarchy:
1. **Folder structure** = what exists (authoritative for content)
2. **_status.md** = where we are (authoritative for position)
3. **Reconciliation** on session start: validate _status.md against folders
4. If mismatch: Update _status.md to match reality, log warning

---

## Tension 6: Specialized Agents vs. Context Efficiency

**The Conflict:**
- Three separate agents (Planner, Builder, Judge) ensure role separation
- But each agent needs context about what the others did

**Evidence:**
- Agents defined separately with different tools (`layer-cake-*.md`)
- "What context gets passed to each agent?" (`brain-dump-meta-test.md:30`)
- "Context limits - how much can each agent hold?" (`brain-dump-meta-test.md:41`)

**Resolution Needed:**
- How much context duplication is acceptable?
- Can agents share a context window somehow?
- What's the minimum context each agent needs?

**Recommendation:**
Define context packages per role:
- **Planner**: Full input + previous layer artifacts + synthesis
- **Builder**: Current spec only + relevant code files + test setup
- **Judge**: Spec + implementation diff + test results + browser access

Avoid: Giving everyone everything (wastes context).

---

## Tension 7: Layer Count vs. Simplicity

**The Conflict:**
- 12 layers provide granular control and forcing functions
- But 12 layers is a lot to understand and manage

**Evidence:**
- Original brain dump had 10 layers, current spec has 12
- "Is 12 layers too many? Should some be combined?" (`brain-dump-meta-test.md:57`)
- "Don't add complexity for complexity's sake" (`brain-dump-meta-test.md:53`)

**Resolution Needed:**
- Are all layers necessary?
- Can some be combined without losing value?
- Which layers could be optional?

**Recommendation:**
Consider consolidating:
- L1 (Input) + L2 (Decompose) -> "Understanding" phase
- L9 (Feature Review) + L10 (Epic Review) -> "Build Review" with scope parameter
- Keep L11 (Final Review) separate as ship gate

Result: 10 layers instead of 12, clearer mental model.

---

## Tension 8: Commit Granularity vs. History Readability

**The Conflict:**
- Commit after each spec item = detailed history
- Many small commits = cluttered git log

**Evidence:**
- "Commit after each spec implemented" (`01-architecture.md:227`)
- "Git history should tell the story of the build" (`00-brain-dump.md:107`)

**Resolution Needed:**
- How granular should commits be?
- Should there be squashing at layer boundaries?
- What about checkpoint commits (WIP)?

**Recommendation:**
Layer-based commit strategy:
- **During L8**: Commit per task (not per subtask)
- **At layer boundary**: Squash WIP commits into clean commits
- **Review results**: Commit with review summary
- **Ship**: Tag release

---

## Tension 9: Template Rigor vs. Contextual Flexibility

**The Conflict:**
- Templates ensure consistency and completeness
- But rigid templates may not fit all situations

**Evidence:**
- Multiple required template sections (`02-layer-specs.md`)
- Feature template requires: Overview, User Value, Requirements (5+), etc.
- What if a feature genuinely only needs 3 requirements?

**Resolution Needed:**
- Are all template sections always required?
- Can agents justify skipping sections?
- What's the "N/A" policy?

**Recommendation:**
Allow "N/A with justification":
- Required sections must be present
- Can be "N/A: {reason}" if genuinely not applicable
- Judge reviews N/A justifications and can reject them

---

## Tension 10: Meta-Test Recursion

**The Conflict:**
- We're using Layer Cake to improve Layer Cake
- But the system isn't implemented yet, so we're improvising

**Evidence:**
- "Using the Layer Cake methodology to improve itself" (`brain-dump-meta-test.md:4`)
- "The system is designed but not yet implemented in code" (`brain-dump-meta-test.md:17`)
- Current execution is manual, not automated

**Resolution Needed:**
- How do we validate the methodology without the tooling?
- Are we testing the concept or the implementation?
- What counts as a valid meta-test?

**Recommendation:**
Accept that the meta-test is partially manual:
- **Concept validation**: Can humans follow the methodology? (Yes, we're doing it)
- **Insight generation**: What improvements do we identify? (This document)
- **Implementation input**: What does the tooling need to support?

The meta-test succeeds if it produces actionable improvements, not if it perfectly follows the automation.

---

## Resolution Priority

| Tension | Severity | Resolution Difficulty | Priority |
|---------|----------|----------------------|----------|
| 1. Thoroughness vs Efficiency | High | Medium | P1 |
| 2. Adversarial vs Paralysis | High | Medium | P1 |
| 5. Filesystem vs _status.md | High | Low | P1 |
| 3. Spec Fidelity vs Judgment | Medium | Low | P2 |
| 4. Human Gates vs Speed | Medium | Medium | P2 |
| 6. Agents vs Context | Medium | High | P2 |
| 7. Layer Count vs Simplicity | Medium | Medium | P3 |
| 8. Commit Granularity | Low | Low | P3 |
| 9. Template Rigor | Low | Low | P3 |
| 10. Meta-Test Recursion | Meta | N/A | Accept |

---

## Summary

The Layer Cake methodology has 10 identified tensions that need resolution. The core tensions (1, 2, 5) affect fundamental system behavior and should be resolved before implementation. The secondary tensions (3, 4, 6) affect efficiency and can be tuned through experience. The tertiary tensions (7, 8, 9) are polish items that can wait.

The meta-test (10) is a special case - we accept that validating a methodology using itself is inherently imperfect, and focus on generating useful insights rather than perfect execution.

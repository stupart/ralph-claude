# Subtasks: Implement Retrospective Improvement Loop

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent System

---

## Subtask 1: Design Methodology Improvement Schema

**Action:** Define the structure for capturing methodology improvements in L12 retrospective.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/retrospective-improvements-template.md` - Improvement entry template

**Template Structure:**
```markdown
## Improvement: {title}

**Type:** Template Change | Prompt Enhancement | Process Modification | Validation Rule

**Source Layer:** L{N} - {layer_name}

**Observation:**
{What was observed during this project that suggests improvement}

**Evidence:**
- Iteration count at {layer}: {N}
- Specific issue: {description}
- File reference: {path to artifact showing issue}

**Suggested Change:**
{Specific modification to make}

**Target File(s):**
- {file path 1}
- {file path 2}

**Priority:** Critical | High | Medium | Low

**Validated By:** {How to confirm the improvement works}
```

**Verification:** Template covers all improvement types; includes evidence and validation fields.

---

## Subtask 2: Add Improvements Section to L12 Prompt

**Action:** Extend the L12 Planner prompt to include methodology improvement analysis.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` - Add improvements section

**Prompt Addition:**
```markdown
## Methodology Improvements

After completing the retrospective analysis, identify any improvements to the Layer Cake methodology itself.

Consider:
1. **High-iteration layers**: Any layer with 3+ iterations suggests template or prompt issues
2. **Cascade patterns**: Repeated MAJOR/ESCALATE cascades from same layer indicate specification gaps
3. **Human gate rejections**: What caused human reviewers to request changes?
4. **Scope gaps**: Any synthesis items that weren't adequately covered in planning?
5. **Builder confusion**: Any subtasks that required clarification indicate spec templates need work

For each improvement identified:
- Classify the type (Template/Prompt/Process/Validation)
- Cite specific evidence from this project
- Propose a concrete change
- Note which files would need modification

Output improvements in: 12-retrospective/methodology-improvements.md
```

**Verification:** L12 prompt includes improvements analysis; covers all consideration areas; specifies output location.

---

## Subtask 3: Create Improvements Log for Cross-Project Tracking

**Action:** Create a running log that aggregates improvements across multiple projects.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/12-retrospective/improvements-log.md` - Running log template

**Log Structure:**
```markdown
# Layer Cake Methodology Improvements Log

## How to Use This Log
Each project's L12 retrospective contributes improvements to this log.
Improvements are reviewed periodically and implemented when patterns emerge.

---

## Pending Improvements

### {Date} - {Project Name}

{Copy of improvement entries from project retrospective}

---

## Implemented Improvements

### {Date} - {Improvement Title}
**Source Projects:** {list of projects that identified this}
**Change Made:** {description}
**Files Modified:** {list}

---

## Rejected Improvements

### {Date} - {Improvement Title}
**Reason:** {why this wasn't implemented}
```

**Verification:** Log has sections for pending, implemented, and rejected; tracks source projects.

---

## Subtask 4: Implement Improvement Pattern Recognition

**Action:** Add prompting for the Planner to recognize common improvement patterns.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` - Add pattern recognition

**Pattern Recognition Prompts:**
```markdown
### Common Improvement Patterns

Watch for these recurring issues:

1. **Template Gap Pattern**
   - Symptom: Same field missing across multiple artifacts
   - Improvement: Add field to template with guidance

2. **Ambiguity Pattern**
   - Symptom: Builder asks for clarification on same issue type repeatedly
   - Improvement: Add explicit examples to subtask template

3. **Scope Drift Pattern**
   - Symptom: Late discovery of missed requirements
   - Improvement: Enhance Judge scope coverage prompts

4. **Validation Gap Pattern**
   - Symptom: Issues caught at L9+ that could have been caught at L3-L7
   - Improvement: Add earlier validation rules

5. **Human Gate Pattern**
   - Symptom: Human consistently catches same type of issue
   - Improvement: Add automated check for that issue type
```

**Verification:** Common patterns are documented; Planner is prompted to recognize them.

---

## Subtask 5: Add Improvement Aggregation Logic

**Action:** Define how improvements from multiple projects should be aggregated and prioritized.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/improvement-process.md` - Process documentation

**Aggregation Rules:**
1. Same improvement from 2+ projects: Escalate priority
2. Conflicting improvements: Note in log, require human decision
3. Critical improvements: Implement immediately
4. Low priority: Batch for quarterly review

**Priority Escalation:**
- Low (1 project) -> Medium (2 projects) -> High (3+ projects)
- Any Critical stays Critical

**Verification:** Aggregation rules are documented; priority escalation is clear.

---

## Subtask 6: Create Improvement Implementation Checklist

**Action:** Define the process for implementing an improvement once approved.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/improvement-implementation-checklist.md` - Implementation guide

**Checklist:**
```markdown
# Improvement Implementation Checklist

## Before Implementation
- [ ] Improvement has 2+ source projects OR is Critical priority
- [ ] No conflicting improvements pending
- [ ] Target files identified
- [ ] Change is reversible

## Implementation
- [ ] Create branch for improvement
- [ ] Modify target files
- [ ] Update relevant tests
- [ ] Document change in improvements-log.md

## After Implementation
- [ ] Move improvement to "Implemented" section in log
- [ ] Note implementation date and files changed
- [ ] Monitor next 2 projects for effectiveness

## Rollback Criteria
- Improvement causes more iterations than before
- Multiple projects request reverting
```

**Verification:** Checklist covers before/during/after; includes rollback criteria.

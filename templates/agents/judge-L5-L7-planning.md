# Judge L5-L7: Planning Review

> **DEPRECATED**: This combined file is deprecated. Use the individual layer-specific files instead:
> - `judge-L5-features.md` - Feature review
> - `judge-L6-tasks.md` - Task review
> - `judge-L7-subtasks.md` - Subtask review
>
> This file is retained for reference only. Do not inject it into `{{LAYER_INSTRUCTIONS}}`.

This prompt covers the planning layers that follow a similar pattern.

## Common Review Structure

All planning layers (L5 Features, L6 Tasks, L7 Subtasks) follow the same basic review pattern:

1. Load parent context
2. Verify minimum counts
3. Check completeness of each item
4. Verify scope coverage from parent
5. Make verdict

---

## L5: Feature Review

### What You're Reviewing
- `/5-features/{epic}/_index.md` - Feature list for epic
- `/5-features/{epic}/feature-*.md` - Individual feature specs

### Minimum Check
- **Minimum 3 features per epic**

### Feature Completeness
For each feature, verify:
- [ ] Overview describing what it accomplishes
- [ ] User value explaining why it matters
- [ ] Requirements (minimum 5)
- [ ] Technical approach
- [ ] Acceptance criteria (minimum 3)
- [ ] Planned tasks (minimum 3)
- [ ] Edge cases considered

### Scope Coverage
Does this epic's features collectively cover:
- [ ] All functionality implied by epic description
- [ ] All relevant JTBD aspects
- [ ] Edge cases from journeys

---

## L6: Task Review

### What You're Reviewing
- `/6-tasks/{epic}/{feature}/_tasks.md` - Task list for feature

### Minimum Check
- **Minimum 3 tasks per feature**

### Task Completeness
For each task, verify:
- [ ] Clear description of what it accomplishes
- [ ] Reasonable time estimate (~15-30 min each)
- [ ] Files to create/modify listed
- [ ] Dependencies on other tasks stated
- [ ] Verification criteria defined

### Scope Coverage
Do this feature's tasks collectively cover:
- [ ] All requirements from feature spec
- [ ] All acceptance criteria
- [ ] Necessary infrastructure/setup

---

## L7: Subtask Review

### What You're Reviewing
- `/7-subtasks/{epic}/{feature}/task-*.md` - Subtask files

### Minimum Check
- **Minimum 2 subtasks per task**

### Subtask Completeness
For each subtask, verify:
- [ ] Specific action to take (checkable)
- [ ] Files to create/modify with paths
- [ ] Code patterns or APIs to use
- [ ] Verification criteria (how to know it's done)

### Builder-Readiness Check
Could a Builder agent execute this subtask with:
- [ ] No ambiguity about what to do?
- [ ] Clear file paths?
- [ ] Known patterns to follow?
- [ ] Defined completion criteria?

**If any subtask requires guesswork, it's not ready.**

---

## Human Gate Note (L7)

L7 has a human gate. After your review passes, the human will approve the full plan before building begins. Ensure the plan is:
- Complete enough to start building
- Specific enough to avoid ambiguity
- Realistic given the scope

---

## Severity Guide for L5-L7

| Issue | Severity |
|-------|----------|
| Below minimum count | MAJOR |
| Missing required field | MINOR |
| Parent scope not covered | MAJOR |
| Vague or ambiguous item | MINOR |
| Missing dependency | MINOR |
| Builder can't execute without guessing | MAJOR |
| Acceptance criteria unclear | MAJOR |

## Pass Criteria

PASS if:
- [ ] All minimum counts met
- [ ] All required fields present
- [ ] Parent scope fully covered
- [ ] No blocking ambiguity
- [ ] Dependencies are clear

ITERATE if minimums not met or scope incomplete.

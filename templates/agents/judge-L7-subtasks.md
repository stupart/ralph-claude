# Judge L7: Subtask Review

## What You're Reviewing
- `/7-subtasks/{epic}/{feature}/task-*.md` - Subtask files

## Minimum Check
- **Minimum 2 subtasks per task**

## Subtask Completeness
For each subtask, verify:
- [ ] Specific action to take (checkable)
- [ ] Files to create/modify with paths
- [ ] Code patterns or APIs to use
- [ ] Verification criteria (how to know it's done)

## Builder-Readiness Check
Could a Builder agent execute this subtask with:
- [ ] No ambiguity about what to do?
- [ ] Clear file paths?
- [ ] Known patterns to follow?
- [ ] Defined completion criteria?

**If any subtask requires guesswork, it's not ready.**

## Traceability
Follow the Scope Coverage Protocol (scope-coverage-protocol.md) for traceability verification.

## Human Gate Note

L7 has a human gate. After your review passes, the human will approve the full plan before building begins. Ensure the plan is:
- Complete enough to start building
- Specific enough to avoid ambiguity
- Realistic given the scope

## Severity Guide

| Issue | Severity |
|-------|----------|
| Below minimum count (< 2 subtasks) | MAJOR |
| Missing required field | MINOR |
| Parent task scope not covered | MAJOR |
| Vague or ambiguous subtask | MINOR |
| Missing dependency | MINOR |
| Builder can't execute without guessing | MAJOR |
| Missing file paths | MAJOR |

## Pass Criteria

PASS if:
- [ ] Minimum 2 subtasks per task
- [ ] All required fields present on every subtask
- [ ] Task scope fully covered by subtasks
- [ ] No blocking ambiguity
- [ ] Dependencies are clear
- [ ] Every subtask is Builder-ready (no guesswork)

ITERATE if minimums not met or scope incomplete.

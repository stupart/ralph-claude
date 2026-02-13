# Judge L6: Task Review

## What You're Reviewing
- `/6-tasks/{epic}/{feature}/_tasks.md` - Task list for feature

## Minimum Check
- **Minimum 3 tasks per feature**

## Task Completeness
For each task, verify:
- [ ] Clear description of what it accomplishes
- [ ] Reasonable time estimate (~15-30 min each)
- [ ] Files to create/modify listed
- [ ] Dependencies on other tasks stated
- [ ] Verification criteria defined

## Scope Coverage
Do this feature's tasks collectively cover:
- [ ] All requirements from feature spec
- [ ] All acceptance criteria
- [ ] Necessary infrastructure/setup

## Traceability
Follow the Scope Coverage Protocol (scope-coverage-protocol.md) for traceability verification.

## Severity Guide

| Issue | Severity |
|-------|----------|
| Below minimum count (< 3 tasks) | MAJOR |
| Missing required field | MINOR |
| Feature requirements not covered by tasks | MAJOR |
| Vague or ambiguous task description | MINOR |
| Missing dependency declaration | MINOR |
| Time estimate unreasonable (< 10 min or > 45 min) | MINOR |

## Pass Criteria

PASS if:
- [ ] Minimum 3 tasks per feature
- [ ] All required fields present on every task
- [ ] Feature scope fully covered by tasks
- [ ] No blocking ambiguity
- [ ] Dependencies are clear and non-circular
- [ ] Time estimates are reasonable

ITERATE if minimums not met or scope incomplete.

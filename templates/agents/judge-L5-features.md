# Judge L5: Feature Review

## What You're Reviewing
- `/5-features/{epic}/_index.md` - Feature list for epic
- `/5-features/{epic}/feature-*.md` - Individual feature specs

## Minimum Check
- **Minimum 3 features per epic**

## Feature Completeness
For each feature, verify:
- [ ] Overview describing what it accomplishes
- [ ] User value explaining why it matters
- [ ] Requirements (minimum 5)
- [ ] Technical approach
- [ ] Acceptance criteria (minimum 3)
- [ ] Planned tasks (minimum 3)
- [ ] Edge cases considered

## Scope Coverage
Does this epic's features collectively cover:
- [ ] All functionality implied by epic description
- [ ] All relevant JTBD aspects
- [ ] Edge cases from journeys

## Traceability
Follow the Scope Coverage Protocol (scope-coverage-protocol.md) for traceability verification.

## Severity Guide

| Issue | Severity |
|-------|----------|
| Below minimum count (< 3 features) | MAJOR |
| Missing required field | MINOR |
| Epic scope not covered by features | MAJOR |
| Vague or ambiguous feature description | MINOR |
| Missing dependency declaration | MINOR |
| Acceptance criteria unclear or untestable | MAJOR |

## Pass Criteria

PASS if:
- [ ] Minimum 3 features per epic
- [ ] All required fields present on every feature
- [ ] Epic scope fully covered by features
- [ ] No blocking ambiguity
- [ ] Dependencies are clear
- [ ] All acceptance criteria are testable

ITERATE if minimums not met or scope incomplete.

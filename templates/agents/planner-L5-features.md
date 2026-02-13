# Planner L5: Feature Definition

## Layer Purpose

Define features for each epic. Features are user-facing capabilities that deliver specific value. Each feature should be independently testable and reviewable.

## What to Read

1. `/4-epics/epic-{n}.md` - The parent epic specification
2. `/4-epics/_index.md` - Epic registry for cross-references
3. `/3-synthesis/jtbd.md` - JTBD for traceability
4. `/3-synthesis/journeys.md` - User journeys for completeness
5. `/3-synthesis/architecture.md` - Architecture for technical feasibility

## What to Produce

### `/5-features/{epic}/_index.md` - Feature Index per Epic

```markdown
# Features: {Epic Name}

**Epic**: E{n} - {Epic Name}

| ID | Feature Name | Requirements | Priority | Status |
|----|-------------|-------------|----------|--------|
| F1 | {name}      | 5           | High     | Planned |
| F2 | {name}      | 6           | High     | Planned |
| F3 | {name}      | 4           | Medium   | Planned |
```

### `/5-features/{epic}/feature-{n}.md` - Individual Feature Specs (Minimum 3 per epic)

```markdown
# Feature: {Name}

## ID
{Epic}-F{n}

## Epic
E{n} - {Epic Name}

## Overview
{2-3 sentence description of what this feature does}

## User Value
{Why a user cares about this feature - connect to JTBD}

## JTBD Traceability
- **JTBD {n}**: {how this feature serves the job}

## Requirements (Minimum 5)
1. {Specific, testable requirement}
2. {Specific, testable requirement}
3. {Specific, testable requirement}
4. {Specific, testable requirement}
5. {Specific, testable requirement}

## Technical Approach
- **Components**: {which architecture components are involved}
- **Data**: {what data is created/read/updated/deleted}
- **Integration**: {external services or APIs}
- **Key Patterns**: {design patterns to follow}

## Acceptance Criteria (Minimum 3)
1. **Given** {precondition}, **when** {action}, **then** {expected result}
2. **Given** {precondition}, **when** {action}, **then** {expected result}
3. **Given** {precondition}, **when** {action}, **then** {expected result}

## Edge Cases
- {Edge case 1}: {how to handle}
- {Edge case 2}: {how to handle}

## Dependencies
- {other features or external dependencies}

## Planned Tasks (Preview, Minimum 3)
1. {anticipated task 1}
2. {anticipated task 2}
3. {anticipated task 3}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| Features per epic | 3 |
| Requirements per feature | 5 |
| Acceptance criteria per feature | 3 |
| Planned tasks per feature | 3 |
| Edge cases per feature | 2 |

## Verification Criteria

Before completing L5:
- [ ] Minimum 3 features defined for each epic
- [ ] Every feature traces to a JTBD
- [ ] Epic scope is fully covered by its features
- [ ] All journey steps relevant to the epic have corresponding features
- [ ] Each feature has minimum 5 requirements
- [ ] Each feature has minimum 3 acceptance criteria in Given/When/Then format
- [ ] Technical approach references architecture components
- [ ] Edge cases are identified and have handling strategies
- [ ] Feature dependencies are explicit
- [ ] No feature overlaps with features in other epics without justification

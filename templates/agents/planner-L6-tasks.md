# Planner L6: Task Specification

## Layer Purpose

Break each feature into implementation tasks. Each task is a focused unit of work targeting 15-30 minutes of Builder execution time. Tasks should be ordered by dependency.

## What to Read

1. `/5-features/{epic}/feature-{n}.md` - The parent feature specification
2. `/5-features/{epic}/_index.md` - Feature index for cross-references
3. `/3-synthesis/architecture.md` - Architecture for implementation guidance
4. `/4-epics/epic-{n}.md` - Epic context

## What to Produce

### `/6-tasks/{epic}/{feature}/_tasks.md` - Task List per Feature (Minimum 3 tasks)

```markdown
# Tasks: {Feature Name}

**Feature**: {Epic}-F{n} - {Feature Name}
**Epic**: E{n} - {Epic Name}

## Task Execution Order

| Order | Task ID | Task Name | Estimate | Dependencies | Status |
|-------|---------|-----------|----------|-------------|--------|
| 1     | T1      | {name}    | 20 min   | None        | Planned |
| 2     | T2      | {name}    | 25 min   | T1          | Planned |
| 3     | T3      | {name}    | 15 min   | T1, T2      | Planned |

## Task 1: {Name}

### Description
{What this task accomplishes in 1-2 sentences}

### Why
{Traces to which requirement(s) and acceptance criteria from the feature spec}

### Time Estimate
{15-30 minutes}

### Files to Create/Modify
- `{path/to/file.ext}` - {what changes}
- `{path/to/file.ext}` - {what changes}

### Dependencies
- {Other tasks that must be completed first}
- {External dependencies}

### Implementation Notes
- {Specific patterns to follow}
- {Libraries or APIs to use}
- {Gotchas or tricky parts}

### Verification Criteria
- [ ] {How to verify this task is done}
- [ ] {Test to run}
- [ ] {Expected outcome}

---

{Repeat for each task}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| Tasks per feature | 3 |
| Files listed per task | 1 |
| Verification criteria per task | 2 |

## Task Sizing Guidelines

- **Target**: 15-30 minutes of Builder execution time
- **Too Small**: If a task is under 10 minutes, consider merging with a related task
- **Too Large**: If a task is over 45 minutes, split into smaller tasks
- **Includes**: Implementation + testing time, not planning time

## Verification Criteria

Before completing L6:
- [ ] Minimum 3 tasks per feature
- [ ] Each task has a time estimate between 15-30 minutes
- [ ] All feature requirements are covered by at least one task
- [ ] All acceptance criteria are addressed by task verification criteria
- [ ] Task dependencies form a valid order (no circular dependencies)
- [ ] Files to create/modify are listed for each task
- [ ] Each task has verification criteria
- [ ] Tasks collectively cover the full feature scope
- [ ] Infrastructure/setup tasks come before dependent implementation tasks
- [ ] No task requires guesswork about what to implement

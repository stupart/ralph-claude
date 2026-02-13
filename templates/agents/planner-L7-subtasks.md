# Planner L7: Subtask Definition

## Layer Purpose

Break each task into atomic subtasks. Subtasks are the smallest unit of work - each should be a single, verifiable action that a Builder agent can execute without ambiguity. This is the final planning layer before implementation.

## What to Read

1. `/6-tasks/{epic}/{feature}/_tasks.md` - The parent task specifications
2. `/5-features/{epic}/feature-{n}.md` - Feature spec for requirements context
3. `/3-synthesis/architecture.md` - Architecture for code patterns
4. Any existing codebase files referenced in tasks

## What to Produce

### `/7-subtasks/{epic}/{feature}/task-{n}.md` - Subtask File per Task (Minimum 2 subtasks per task)

```markdown
# Subtasks: {Task Name}

**Task**: T{n} - {Task Name}
**Feature**: {Epic}-F{n} - {Feature Name}
**Epic**: E{n} - {Epic Name}

## Subtask 1: {Action Description}

### Action
{Precise, single action to take - must be checkable as done/not done}

### Files
- **Create**: `{path/to/new-file.ext}` - {purpose}
- **Modify**: `{path/to/existing-file.ext}` - {what to change}

### Code Patterns
- {Specific pattern, API, or approach to use}
- {Example: "Use React useState hook for form state"}
- {Example: "Follow existing error handling pattern in utils/errors.ts"}

### Implementation Detail
```
{Pseudocode, type signatures, or specific code structure to follow}
```

### Verification
- [ ] {Specific check: file exists, test passes, output matches}
- [ ] {Specific check: no regressions in related functionality}

### Commit Message
`[L8] {task name}: {subtask description}`

---

{Repeat for each subtask}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| Subtasks per task | 2 |
| Files listed per subtask | 1 |
| Verification checks per subtask | 1 |

## Subtask Quality Standards

### Must Be Atomic
- One logical action per subtask
- Can be completed in a single commit
- Does not depend on decisions made during execution

### Must Be Unambiguous
- Builder should not need to make design decisions
- File paths are exact (not approximate)
- Code patterns are specified (not "figure out the best approach")

### Must Be Verifiable
- Every subtask has at least one concrete verification check
- Checks are objective (pass/fail, not subjective quality)
- Tests are specified where applicable

## Verification Criteria

Before completing L7:
- [ ] Minimum 2 subtasks per task
- [ ] Every subtask specifies exact file paths
- [ ] Every subtask has verification criteria
- [ ] Subtasks are atomic (one action each)
- [ ] No subtask requires the Builder to make design decisions
- [ ] Code patterns or APIs are specified where relevant
- [ ] Commit messages follow the `[L8]` format
- [ ] Subtasks collectively cover the full task scope
- [ ] A Builder agent could execute every subtask without asking questions
- [ ] Subtask order within a task respects dependencies

## Human Gate Reminder

L7 is followed by a human gate. The plan will be reviewed by a human before L8 (Build) begins. Ensure the subtask definitions are:
- Complete enough that no planning gaps remain
- Specific enough that implementation is mechanical
- Realistic in scope and time estimation

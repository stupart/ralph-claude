## Phase 1: Brain Dump Analysis

First, check if any brain dump files exist in `docs/` (pattern: `brain-dump-*.md`). If they do:

1. Read ALL of them thoroughly
2. Use the Task tool with subagent_type=Explore to deeply analyze any links, references, or technical concepts mentioned
3. Extract and internalize:
   - Core requirements and goals
   - Implicit constraints and preferences
   - Technical decisions already made
   - Anti-patterns or things to avoid
   - Scope and scale of the project

If there's an existing codebase, also analyze project structure, patterns, and what exists vs what's needed.

---

## Phase 2: Interview

Interview me using AskUserQuestionTool.

**Start with basics** (skip if answered in brain dump):
1. What are we building?
2. What tech stack?
3. What's the core functionality?
4. What's the rough scope? (weekend project, week, month?)

**Go deep:**
- Every user-facing feature
- Every technical component
- Data models and relationships
- API contracts if applicable
- UI flows and screens
- Edge cases and error handling
- Performance requirements
- Security considerations
- Integration points
- Deployment/infrastructure

**Keep asking until you have a complete mental model.** 30-50+ questions for larger projects.

---

## Phase 3: Hierarchical Planning (CRITICAL)

Before creating the PRD, create a detailed `plan.md` with FRACTAL BREAKDOWN.

Break down recursively until each leaf task is ~15-30 mins of work:

```markdown
# Project Plan: [Name]

## Epic 1: [Major Area]
### Feature 1.1: [Feature Name]
#### Task 1.1.1: [Task]
- [ ] Subtask 1.1.1.1: [Atomic step]
- [ ] Subtask 1.1.1.2: [Atomic step]
#### Task 1.1.2: [Task]
- [ ] Subtask 1.1.2.1: [Atomic step]
...

## Epic 2: [Major Area]
### Feature 2.1: [Feature Name]
...
```

**Rules for breakdown:**
- Epics = major functional areas (auth, payments, dashboard, etc.)
- Features = user-visible capabilities within an epic
- Tasks = technical work to implement a feature
- Subtasks = atomic steps (~15-30 min each)
- Keep going until subtasks are concrete and actionable
- Include setup, testing, and verification as explicit tasks
- Order by dependencies (what must come first)

**Estimate total scope.** If it's a 10-hour project, you should have ~20-40 subtasks.

---

## Phase 4: Generate PRD from Plan

NOW create PRD.json. Each **Feature** in the PRD maps to a Feature (level 3) in the plan:

```json
{
  "project": "Project Name",
  "features": [
    {
      "id": "F000",
      "name": "Project Setup",
      "description": "Initialize project with [stack]",
      "status": "pending",
      "acceptance_criteria": ["builds without errors", "dev server runs"],
      "plan_ref": "1.1"
    },
    {
      "id": "F001",
      "name": "Feature from plan",
      "description": "What it does",
      "status": "pending",
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "plan_ref": "1.2"
    }
  ]
}
```

**Important:**
- `plan_ref` links to the section in plan.md
- PRD features should be granular - if a feature has 10+ subtasks, split it
- Aim for 10-20+ features for a 10hr project, not 5-6

---

## Phase 5: User Journey Map (SOURCE OF TRUTH)

Create `docs/user-journey.md` - this is THE definition of "done":

```markdown
# User Journeys

These journeys define what "complete" means. The app is done when every journey works end-to-end.

## Journey 1: [Primary Use Case]
> One-line description of who and what

1. User [action]
2. System [response]
3. User sees [result]
4. User [next action]
5. ...
6. **End state**: [what success looks like]

## Journey 2: [Secondary Use Case]
...

## Journey 3: [Edge Case / Error Path]
...
```

**Every feature should map to at least one journey.** If a feature doesn't appear in any journey, question if it's needed.

This is the ultimate test: can you walk through each journey and everything works?

---

## Phase 6: Verification Checklist

Create `docs/verification.md` with specific test cases:

```markdown
# Verification Checklist

## F001: [Feature Name]
- [ ] Test case 1: [action] → [expected result]
- [ ] Test case 2: [action] → [expected result]
- [ ] Edge case: [what happens when X]
- [ ] Journey coverage: [which journeys this enables]

## F002: [Feature Name]
...
```

---

## Summary

After this interview, you should have created:
1. `plan.md` - Hierarchical fractal breakdown (Epics → Features → Tasks → Subtasks)
2. `PRD.json` - Features derived from plan, properly scoped
3. `docs/user-journey.md` - **Source of truth** for what "done" means
4. `docs/verification.md` - Test cases for each feature

The Ralph loop will:
- Use `plan.md` for detailed task guidance
- Use `PRD.json` for status tracking
- Use `docs/user-journey.md` to verify completeness
- **CAN edit PRD.json** to add/split/refine features during development

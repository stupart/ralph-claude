You are in BUILDING mode.

## Before Starting
1. Read CLAUDE.md, PRD.json, progress.md, guardrails.md, and plan.md
2. Identify the NEXT incomplete task from plan.md
3. Work on ONLY that task

## Implementation Rules
1. Write code for the current task
2. Write/update tests
3. Run tests - fix until they pass
4. Run typecheck - fix until it passes
5. Run lint - fix until it passes
6. Verify manually (browser, curl, etc.)
7. Commit with descriptive message referencing feature ID

## After Each Task
1. Update progress.md with what you did
2. Update PRD.json if a feature is now "passing" (only if ALL criteria verified)
3. Update plan.md to mark the task complete
4. Move to the next task

## When to Stop
- If you complete all tasks in plan.md
- If you hit a blocker you can't resolve
- If context is getting full (prepare handoff notes)
- If you've been on the same issue for too long

## Exit Checklist
Before ending the session:
- [ ] All changes committed
- [ ] progress.md updated
- [ ] PRD.json status fields accurate
- [ ] plan.md reflects current state

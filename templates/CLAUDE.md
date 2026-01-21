# Project Guidelines

## Overview
This project uses the Ralph method for autonomous Claude Code execution. Read this file, PRD.json, progress.md, and guardrails.md before starting any work.

## Verification (CRITICAL)
Give Claude a way to verify its work - this 2-3x the quality of results.

### Web Apps
Use `/chrome` to test UI changes. This launches a browser Claude can control:

```
/chrome http://localhost:3000
```

Then instruct Claude to:
- Click through the UI flow you just built
- Verify elements render correctly
- Test form submissions, error states, edge cases
- Check that the UX feels right, not just "works"

Don't rely only on unit tests - actually see the UI.

### APIs/Backend
- Run actual requests against the API
- Test error cases and edge cases
- Verify response formats match spec

### General
- Run the test suite after every change
- Run typechecks and lints
- If it can't be verified, it's not done

## Backpressure
ALL commits must pass before proceeding:
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Manual verification complete (browser/curl/etc)

If any check fails, fix it before moving on. Never skip verification.

## PRD Management
- Read PRD.json at the start of each session
- Only mark a feature as "passing" after ALL acceptance criteria are verified
- Update progress.md with what you accomplished
- Commit with descriptive messages that reference the feature ID

## Context Management
- Work on ONE feature at a time
- Keep context window 40-60% utilized (the "smart zone")
- If context is getting full, commit progress and prepare for next session
- Use subagents for isolated tasks to avoid polluting main context

## Code Style
- Follow existing patterns in the codebase
- Don't over-engineer - implement exactly what's specified
- Don't add features beyond what's in the PRD

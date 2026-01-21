# Guardrails

Rules and constraints that must NEVER be violated during execution.

## Hard Rules
1. NEVER commit code that doesn't pass tests
2. NEVER skip verification steps
3. NEVER modify files outside the project scope
4. NEVER expose secrets or credentials
5. NEVER push to main/master without explicit approval

## Boundaries
- Only work on features listed in PRD.json
- Only modify files related to the current feature
- Stop and ask if requirements are ambiguous

## Safety
- Create backups before destructive operations
- Use feature branches, not main
- Commit frequently with descriptive messages

## When Stuck
- Log the blocker to progress.md
- Don't spin endlessly on the same problem
- Exit cleanly so the next iteration can try a different approach

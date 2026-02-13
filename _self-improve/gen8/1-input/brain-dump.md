# Self-Improvement Brain Dump - Generation 8

**Date:** 2026-02-13
**Generation:** 8
**Goal:** Edge case hardening, developer experience polish, and advanced prompt engineering

## Accomplished through gen7
- 328 tests across 18 suites, 87% line coverage
- All original bugs fixed, all original IDEAS.md items complete
- Full observability stack (events, stall detection, notifications, webhooks)
- Parallel epic execution, config files, template caching, retry with backoff
- Advisory file locking, project templates, CLI entry point
- Comprehensive prompts with examples, anti-vagueness rules, scope limits

## Areas for gen8 improvement

### Edge Case Hardening
1. **Validator edge cases** - Test and handle: empty markdown files, files with only whitespace, malformed headers, unicode content, extremely long lines, files with Windows line endings (CRLF)
2. **Router boundary conditions** - What happens when cascade target is L1? When iteration count overflows? When verdict is missing from review output?
3. **State machine corruption recovery** - If _status.md is partially written (power loss), the recovery module should detect and fix truncated JSON/YAML

### Developer Experience
4. **Dry-run mode** - Add `--dry-run` flag to CLI and ralph.js that shows what would be spawned (prompt assembly, tool permissions, context files) without executing. Useful for debugging prompt issues.
5. **Layer timing** - Track wall-clock time per layer in addition to token costs. Add to getStatus() output and event log.
6. **Colored CLI output** - Add ANSI color codes to ralph-cli.js status command for better readability (green=complete, yellow=current, gray=pending).

### Advanced Prompt Engineering
7. **Context window budget** - Add token estimation to agent-spawner.js that warns when assembled prompt + context exceeds a configurable percentage of Claude's context window (default 40%).
8. **Dynamic prompt sections** - Allow planner/builder/judge prompts to conditionally include sections based on project tier. Micro projects don't need the full "Good vs Bad" tables.
9. **Iteration learning** - When a judge sends an ITERATE verdict back to the builder, include a "lessons from previous iterations" section in the builder's next prompt so it doesn't repeat the same mistakes.

## Improvement Targets for Gen8
1. Add validator edge case tests (empty files, CRLF, unicode, malformed markdown)
2. Add router boundary condition tests (cascade to L1, overflow, missing verdict)
3. Add dry-run mode to ralph.js and CLI
4. Add wall-clock layer timing to ralph.js (integrated with cost tracker and event logger)
5. Add colored output to CLI status command
6. Add context window budget estimation to agent-spawner.js
7. Add iteration learning (previous iteration context) to builder re-prompting

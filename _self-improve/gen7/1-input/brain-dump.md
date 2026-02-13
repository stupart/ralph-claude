# Self-Improvement Brain Dump - Generation 7

**Date:** 2026-02-13
**Generation:** 7
**Goal:** Parallel epic building, performance, robustness, and polish

## Accomplished through gen6
- All 4 bugs fixed
- 269 jest tests across 15 suites
- Full observability: event logger, stall detector, terminal notifications, webhooks
- Cost tracking per layer
- Subprocess kill enforcement with SIGTERM/SIGKILL
- Project templates with variable resolution
- CLI entry point (init, run, status, resume, cost)
- Comprehensive prompts with Good/Bad examples, anti-vagueness rules, scope limits
- End-to-end and recovery integration tests
- Prompt template validation tests
- README with Layer Cake documentation

## Only remaining IDEAS.md item
1. **Parallel epic building** - Epics with no dependencies could run in parallel Claude sessions

## New improvement areas identified

### Architecture & Performance
2. **Parallel epic execution** - Add a `ParallelExecutor` class that can run multiple independent epics concurrently using worker threads or separate processes. Include merge strategy for results.
3. **Caching layer** - Cache agent prompt assembly results to avoid re-reading template files on every spawn. The spawner reads 2-3 template files per layer.
4. **Retry with backoff** - When an agent fails (not ITERATE verdict, but actual crash/timeout), retry with exponential backoff before escalating.

### Testing & Quality
5. **Mutation testing** - Add a test that verifies the validator catches specific bad inputs (missing fields, wrong types, boundary conditions)
6. **Concurrent state machine test** - Test that two simultaneous writes to _status.md don't corrupt state (file locking or atomic writes)
7. **Test coverage report** - Add jest coverage configuration and ensure >80% line coverage across all modules

### Polish & UX
8. **Progress bar** - Add a terminal progress bar to the CLI showing which layer is active and overall progress
9. **JSON output mode** - Add `--json` flag to CLI for machine-readable output (for piping into other tools)
10. **Config file support** - Read `ralph.config.json` or `.ralphrc` for default options (tier, timeout, template, webhook URL)

## Improvement Targets for Gen7
1. Add ParallelExecutor class for concurrent epic building with configurable concurrency limit
2. Add prompt template caching to agent-spawner.js
3. Add retry with exponential backoff for agent crashes in ralph.js
4. Add concurrent state machine safety (file locking or atomic writes)
5. Add config file support (.ralphrc or ralph.config.json)
6. Add jest coverage configuration targeting >80% line coverage
7. Update IDEAS.md and README.md

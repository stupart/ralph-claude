# Self-Improvement Brain Dump - Generation 6

**Date:** 2026-02-13
**Generation:** 6
**Goal:** Project templates, parallel epic building, end-to-end integration, and prompt refinement

## Accomplished through gen5
- All 4 bugs fixed
- 180 jest tests across 10 suites
- Full observability: event logger, stall detector, terminal notifications, webhooks
- Cost tracking per layer
- Subprocess kill enforcement
- Comprehensive prompts with Good/Bad examples, anti-vagueness rules, scope limits
- README with Layer Cake documentation
- Self-improvement loop infrastructure

## What remains from IDEAS.md (only 2 items)
1. **Parallel epic building** - Epics with no dependencies could run in parallel Claude sessions
2. **Project templates** - `ralph init --template web-app` with pre-configured setup

## Additional improvements identified
3. **End-to-end integration test** - Run a minimal project through L1→L12 with mocked agents to validate the full pipeline
4. **Prompt template variable system** - The `{{LAYER_INSTRUCTIONS}}` placeholder in planner-base.md is used but not documented. Formalize the template variable system.
5. **Error recovery integration tests** - Test recovery manager with realistic scenarios (crashed mid-L8, stale lock, corrupted status)
6. **Agent spawner dry-run mode** - Add a `--dry-run` flag that shows what would be spawned without executing, for debugging prompt assembly
7. **Validate all prompt templates load correctly** - Add a test that iterates all .md files in templates/agents/ and verifies they parse and load without errors
8. **CLI polish** - The JS layer has no proper CLI entry point. Add a `bin/ralph-cli.js` with commands: `init`, `run`, `status`, `resume`, `cost`

## Improvement Targets for Gen6
1. Add project template system: `ralph init --template web-app` creates scaffolding with CLAUDE.md, _status.md, folder structure, and starter brain-dump.md
2. Add end-to-end integration test that runs mocked agents through all 12 layers
3. Add error recovery integration tests (crash scenarios, stale state, missing files)
4. Add prompt template validation test (all .md files load and have required sections)
5. Add proper CLI entry point (bin/ralph-cli.js) with init, run, status, resume, cost commands
6. Document the template variable system in the planner-base.md header
7. Update IDEAS.md

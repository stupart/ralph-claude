## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation with 12 pipeline layers:
- L1-L3: Understanding layers (input analysis, decomposition, synthesis)
- L4-L7: Planning layers (epic definition, feature specs, task breakdown, subtask definition)
- L8: Build layer (code generation)
- L9-L11: Review layers (code review, integration review, learning)
- L12: Learning layer (feedback integration)

Key production modules: `lib/ralph.js`, `lib/state-machine.js`, `lib/agent-spawner.js`, `lib/validator.js`, `lib/verdict-parser.js`, `lib/router.js`.

The test suite uses Jest and is organized into:
- `tests/integration/` — Integration tests for pipeline behavior
- `tests/helpers/` — Shared test utilities including `createTestProject()` for temporary project directories and `MockExecutor` for agent simulation

## The problem

The existing test suite covers main happy paths effectively but has gaps in:
- Error handling edge cases: many `catch` blocks and error branches in `lib/` modules lack test coverage
- Unusual configuration combinations: constructors accept many optional parameters but tests use default configurations
- Module integration boundaries: tests mock individual modules but don't exercise the handoff points between them
- Recovery scenarios: `lib/recovery.js` handles crash recovery with various filesystem states but has limited test coverage
- Boundary conditions: timeout edge cases, empty input handling, and maximum retry exhaustion are under-tested

## What to fix

1. **Error handling in `lib/validator.js`**: Write tests for validation failure paths — missing required sections, malformed headings, empty artifacts, oversized artifacts. Use `createTestProject()` to set up projects with invalid artifacts. Expected: validator returns specific error objects, not generic failures.

2. **State transition edge cases in `lib/state-machine.js`**: Write tests for unusual layer transition sequences — skip layers, backward transitions during cascade, concurrent state updates, transition from terminal states. Use `MockExecutor` to simulate layer completion in different orders. Expected: state machine rejects invalid transitions and handles cascade routing correctly.

3. **Agent spawn configuration in `lib/agent-spawner.js`**: Write tests for spawn edge cases — missing template files, invalid template content, timeout during spawn, spawn with conflicting options. Verify `createSpawnConfig()` produces correct configurations for each layer type. Expected: clear error messages for misconfiguration.

4. **Verdict parsing edge cases in `lib/verdict-parser.js`**: Write tests for malformed verdict strings — missing verdict keyword, ambiguous PASS/ITERATE, truncated output, extra whitespace, mixed case. Expected: parser returns consistent default values for unparseable input.

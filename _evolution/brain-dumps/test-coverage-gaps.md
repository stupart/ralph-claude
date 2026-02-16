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

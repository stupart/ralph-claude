## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation with 12 pipeline layers. Key modules with public APIs: `lib/ralph.js` (Ralph class), `lib/state-machine.js` (StateManager class), `lib/agent-spawner.js` (AgentSpawner class), `lib/validator.js` (Validator class), `lib/verdict-parser.js` (VerdictParser), `lib/router.js` (Router class).

## The problem

Exported functions and classes in `lib/` modules lack comprehensive JSDoc documentation. Public API consumers — including the pipeline's own agent templates and external tooling — cannot understand parameter types, return values, or error conditions without reading the full implementation. This increases onboarding time and makes refactoring risky since callers don't have documented contracts to rely on.

## What to fix

1. **`lib/ralph.js`**: Add JSDoc to `Ralph` class constructor, `initialize()`, `runNextLayer()`, `runProject()`. Document all constructor options with types and defaults. Include `@example` for `runProject(agentExecutor)` showing the executor-as-parameter pattern.

2. **`lib/state-machine.js`**: Add JSDoc to `StateManager` class constructor, `transition()`, `getCurrentState()`, `canTransition()`. Document state transition rules in `@throws` tags.

3. **`lib/agent-spawner.js`**: Add JSDoc to `AgentSpawner` class constructor, `createSpawnConfig()`, `spawn()`. Document the `spawnConfig` object shape with `@typedef`. Include `@param` types for layer IDs and agent types.

Expected JSDoc format for all documented functions:
- `@param {Type} name - Description` for every parameter
- `@returns {Type} Description` for return values
- `@throws {ErrorType} Description` for error conditions
- `@example` for non-obvious usage patterns

## What NOT to do

1. Do not modify function behavior — documentation changes only
2. Do not document private/internal functions (prefixed with `_`)
3. Do not add unnecessary JSDoc complexity (avoid custom `@tags`)
4. Do not add JSDoc to trivial getters/setters where the name is self-documenting
5. Do not change any code logic, imports, or exports

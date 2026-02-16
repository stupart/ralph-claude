## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation. It manages 12 pipeline layers (L1-L3 for understanding, L4-L7 for planning, L8 for building, L9-L11 for review, L12 for learning). Key modules include `lib/ralph.js`, `lib/state-machine.js`, `lib/validator.js`, `lib/agent-spawner.js`, `lib/verdict-parser.js`, and `lib/router.js`.

## The problem

Constructor options in `lib/ralph.js` and other modules accept values without validation. Negative timeouts, non-existent directory paths, wrong types, and out-of-range values pass through silently, causing cryptic runtime errors later in the pipeline. For example:
- Passing `agentTimeout: -1` to Ralph's constructor causes agents to timeout immediately with no useful error
- Passing a non-existent `projectRoot` causes failures deep in the pipeline when trying to read artifacts
- Passing `maxRetries: "three"` (string) causes unexpected behavior in retry loops

## What to fix

1. **Type validation for Ralph constructor options**: Verify `agentTimeout` is a positive number, `maxRetries` is a non-negative integer, `verbose` is a boolean, `projectRoot` is a string. Throw `TypeError` with descriptive message on violation. Acceptance: `new Ralph('/tmp', { agentTimeout: -1 })` throws.

2. **Path existence validation**: Verify `projectRoot` directory exists at construction time. Throw with clear message including the path. Acceptance: `new Ralph('/nonexistent')` throws with message containing the path.

3. **Range validation for timeouts**: Reject `agentTimeout < 0` and `agentTimeout > 3600000` (1 hour max). Reject `maxRetries < 0` and `maxRetries > 10`. Acceptance: boundary values are accepted, out-of-range values throw.

4. **Enum validation for tier option**: Verify `tier` is one of the known tier values ('small', 'medium', 'large'). Acceptance: `new Ralph('/tmp', { tier: 'huge' })` throws with message listing valid options.

## What NOT to do

1. Do not change the default values for any option
2. Do not add external validation libraries (joi, yup, zod, etc.)
3. Do not validate internal-only options that are never user-facing
4. Do not add validation to hot paths that would impact per-layer performance
5. Do not change the constructor signature — keep `(projectRoot, options = {})`

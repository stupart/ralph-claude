## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation. It manages 12 pipeline layers (L1-L3 for understanding, L4-L7 for planning, L8 for building, L9-L11 for review, L12 for learning). Key modules include `lib/ralph.js`, `lib/state-machine.js`, `lib/validator.js`, `lib/agent-spawner.js`, `lib/verdict-parser.js`, and `lib/router.js`.

## The problem

Configuration values loaded by `lib/config.js` are accepted without validation. The `loadConfig()` function merges defaults, file config, and overrides via `mergeConfig()`, but never checks types or ranges. Negative timeouts, wrong types, and out-of-range values pass through silently, causing cryptic runtime errors later in the pipeline. For example:
- Setting `timeout: -1` in `ralph.config.json` causes agents to timeout immediately with no useful error
- Setting `maxRetries: "three"` (string) causes unexpected behavior in retry loops
- Setting `concurrency: 0` causes the parallel executor to hang indefinitely
- Setting `tier: "huge"` (invalid enum) passes through silently and causes confusing failures in agent spawning

## What to fix

1. **Type validation in `mergeConfig()`**: After merging defaults, file config, and overrides, validate that `timeout` is a positive number, `maxRetries` is a non-negative integer, `verbose` is a boolean, `concurrency` is a positive integer. Throw `TypeError` with descriptive message on violation. Acceptance: `mergeConfig({}, { timeout: "fast" })` throws.

2. **Range validation in `mergeConfig()`**: Reject `timeout < 0` and `timeout > 3600000` (1 hour max). Reject `maxRetries < 0` and `maxRetries > 10`. Reject `concurrency < 1` and `concurrency > 16`. Acceptance: boundary values are accepted, out-of-range values throw with a message stating the valid range.

3. **Enum validation for `tier` in `mergeConfig()`**: Verify `tier` is one of the known tier values ('small', 'medium', 'large'). Acceptance: `mergeConfig({}, { tier: 'huge' })` throws with message listing valid options.

4. **Config file parse error context in `readConfigFile()`**: When `ralph.config.json` contains invalid JSON, include the file path and a hint about common syntax errors. Acceptance: a malformed config file produces an error message containing the filename and the JSON parse error detail.

## What NOT to do

1. Do not change the default values in the `DEFAULTS` object
2. Do not add external validation libraries (joi, yup, zod, etc.)
3. Do not validate internal-only options that are never user-facing
4. Do not change the function signatures of `loadConfig()`, `mergeConfig()`, or `readConfigFile()`
5. Do not remove the `ALLOWED_KEYS` filtering — validation is in addition to key filtering, not a replacement

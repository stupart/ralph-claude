## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation with 12 pipeline layers (L1-L3 understanding, L4-L7 planning, L8 building, L9-L11 review, L12 learning). Key modules: `lib/ralph.js`, `lib/state-machine.js`, `lib/validator.js`, `lib/agent-spawner.js`, `lib/verdict-parser.js`, `lib/router.js`. CLI entry point: `bin/ralph-cli.js`.

## The problem

The `README.md` may have drifted from actual behavior as the codebase evolved through multiple versions (v1-v8). CLI usage examples, configuration options, feature descriptions, and architecture diagrams may be outdated or inaccurate. Users and contributors relying on the README for onboarding may encounter incorrect instructions that waste time or cause confusion.

## What to fix

1. **CLI usage examples**: Verify every command example in the README matches the actual `bin/ralph-cli.js` interface. Run each example and confirm it works. Update any that fail or produce different output than documented.

2. **Configuration options**: Compare documented constructor options against actual parameters in `lib/ralph.js` constructor. Verify defaults, types, and descriptions match. Add any undocumented options, remove any that no longer exist.

3. **Installation instructions**: Verify the setup steps work on a fresh clone. Confirm `npm install`, any build steps, and initial configuration are accurate.

4. **Feature descriptions**: Verify each described feature exists and works as documented. Cross-reference with actual module exports and CLI subcommands. Flag features that have been removed or significantly changed.

5. **Architecture description**: Verify module names, layer descriptions, and component relationships match the actual codebase. Update any diagrams or flowcharts that reference renamed or removed modules.

## What NOT to do

1. Do not rewrite the entire README — only correct inaccuracies
2. Do not change the README structure, organization, or tone
3. Do not add new sections that are not already present
4. Do not remove any section, even if it seems empty or outdated — flag it for human review instead
5. Do not change code to match the README — change the README to match the code

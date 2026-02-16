## What this project is

Ralph is a Layer Cake orchestrator for autonomous code generation. It manages 12 pipeline layers (L1-L3 for understanding, L4-L7 for planning, L8 for building, L9-L11 for review, L12 for learning). Key modules include:

- `lib/ralph.js` — Main orchestrator class
- `lib/state-machine.js` — Layer transition state machine
- `lib/validator.js` — Artifact validation engine
- `lib/agent-spawner.js` — Agent process spawning
- `lib/verdict-parser.js` — Review verdict parsing
- `lib/router.js` — Layer routing logic

## The problem

Error messages across `lib/` modules are inconsistent and unhelpful:
- Some errors lack context about what operation failed and what state the system was in
- `lib/validator.js` throws generic "validation failed" without specifying which section or rule
- `lib/state-machine.js` state transition errors don't include the from/to states
- `lib/agent-spawner.js` spawn failures don't include the layer ID or agent type
- There are no error codes for programmatic error handling

## What to fix

1. **`lib/validator.js`**: Add context to validation errors — include the section name, the expected format, and the actual content that failed. Example: change `"Missing required section"` to `"Missing required section '## Architecture' in artifact for L3 (found sections: ['## Overview', '## Design'])"`

2. **`lib/state-machine.js`**: Add from/to state context in transition errors — include current layer, target layer, and reason for rejection. Example: change `"Invalid transition"` to `"Invalid transition from L3 (COMPLETE) to L1 (reason: backward transitions not allowed except via cascade)"`

3. **`lib/agent-spawner.js`**: Add layer and agent context to spawn errors — include layer ID, agent type, and template path. Example: change `"Spawn failed"` to `"Spawn failed for L8 builder agent (template: templates/agents/builder.md, error: template not found)"`

4. **`lib/verdict-parser.js`**: Improve parse failure messages — include the raw verdict text (truncated) and the expected format

## What NOT to do

1. Do not change any function signatures or return types
2. Do not modify test files — only change production code error messages
3. Do not add new npm dependencies
4. Do not change error class hierarchies or introduce new error classes
5. Do not modify happy-path behavior — only change what happens when errors occur

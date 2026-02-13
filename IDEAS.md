# Ralph V3 Ideas & Roadmap

## Notifications & Observability

### Terminal Notifications (macOS) [DONE gen5]
- ~~`osascript` push notifications~~ Uses `terminal-notifier` binary for push notifications at key events: layer transitions, review verdicts, stalls, completion
- Low effort, immediate value for local dev
- Implemented in `lib/notifier.js` with distinct sounds per event type

### Stall Detection Watchdog [DONE gen5]
- ~~Background thread~~ Polling monitor on `_status.md` last-modified time
- Alert if no update in N minutes (configurable, default 10)
- Would have caught both Chrome stalls during the skill tree meta-test
- Implemented in `lib/stall-detector.js`, auto-started in `runProject()`

### Structured Event Log [DONE gen5]
- `_events.jsonl` alongside `_status.md` — machine-readable event stream
- Each event: `{ timestamp, type, layer, epic, verdict, message }`
- Any tool can tail it for live updates
- Implemented in `lib/event-logger.js`, integrated into `ralph.js`

### Webhook Callback [DONE gen5]
- `options.webhookUrl` that POSTs JSON on state changes
- Slack, Discord, or local endpoint integration
- Payload: layer, epic, verdict, iteration, blocker info
- Implemented in `lib/webhook.js` with retry and custom headers

## Orchestrator Improvements

### Chunk Count Validation (BUG-001 fix) [DONE gen2]
- L5 completion should verify chunk folder count matches L4 outline
- L6 completion should verify all chunks have committed code
- L7 should verify all chunks have `_review.md` with PASS
- Replaced by epic/feature/task hierarchy with validator enforcement

### Subprocess Timeout (BUG-003 fix) [DONE gen5]
- Configurable timeout for Claude subprocess (default 5 min)
- Kill and retry on timeout, with event log entry
- AbortController signal + SIGTERM/SIGKILL enforcement
- Implemented in `ralph.js` `runLayerCycle()` with `registerProcess()` callback

### Playwright MCP as Default Browser Testing [DONE gen3]
- Already swapped `/chrome` for Playwright MCP in prompts
- Consider detecting MCP availability before spawning review agents
- Fallback chain: Playwright MCP -> curl/tests -> code review only

### Resume / Recovery [DONE gen2]
- `ralph resume` command that reads `_status.md` and picks up where it left off
- Implemented in `lib/recovery.js` with reconciliation on startup

## Methodology Ideas

### Parallel Epic Building [DONE gen7]
- ~~Chunks with no dependencies could be built in parallel (multiple Claude sessions)~~
- ~~Would need a job queue and merge strategy~~
- Implemented in `lib/parallel-executor.js` with bounded work queue
- Configurable concurrency limit (default 2), FIFO ordering, per-epic result collection
- Graceful failure handling: one epic failing does not stop others

### Human-in-the-Loop Gates [DONE gen2]
- Optional approval gates between layers (like Layer Cake's L3/L7 gates)
- Implemented in state machine with `autoApproveGates` option

### Cost Tracking [DONE gen4]
- Track token usage per layer/iteration
- Report total cost at completion
- Help calibrate tier sizing (micro vs medium vs large)
- Implemented in `ralph.js` `CostTracker` class

### Project Templates [DONE gen6]
- `ralph init --template web-app` with pre-configured CLAUDE.md, brain-dump.md, _status.md, folder scaffolding
- Implemented in `lib/templates.js` with `initProject()`, `listTemplates()`, `loadTemplate()`
- Templates live in `templates/project-templates/<name>/` with `template.json` manifest
- Variable resolution ({{DATE}}, {{PROJECT_NAME}}) with auto and prompt types

### CLI Entry Point [DONE gen6]
- `bin/ralph-cli.js` with commands: init, run, status, resume, cost
- Argument parsing for --dir, --template, --verbose, --quiet, --auto-approve, --timeout
- Integrates template system, recovery manager, state machine, and cost tracker

### End-to-End Integration Tests [DONE gen6]
- Mocked agents through full L1->L12 pipeline in `tests/e2e.test.js`
- Error recovery integration tests in `tests/recovery-e2e.test.js`
- Prompt template validation in `tests/prompt-templates.test.js`
- 269 total tests across 15 suites (up from 180 in 10 suites)

### Template Variable Documentation [DONE gen6]
- Documented {{LAYER_INSTRUCTIONS}}, {{epic}}, {{feature}}, {{task}} in planner-base.md header comment
- Instructions for adding new template variables

### Prompt Template Caching [DONE gen7]
- LRU cache in `AgentSpawner` avoids re-reading template files on every spawn
- Invalidates when file mtime changes, configurable max size (default 20)
- Implemented in `lib/agent-spawner.js` as `TemplateCache` class

### Retry with Exponential Backoff [DONE gen7]
- Agent crashes/timeouts in `runLayerCycle` now retry with backoff (1s, 2s, 4s)
- Up to `maxRetries` times (default 3) before failing
- Only actual errors are retried -- ITERATE verdicts use the routing system

### Concurrent State Safety [DONE gen7]
- Advisory file locking on `_status.md.lock` using O_EXCL (exclusive create)
- Stale lock detection (breaks locks older than 30s)
- Prevents corruption from concurrent access during parallel epic building

### Config File Support [DONE gen7]
- Reads `ralph.config.json` or `.ralphrc` for default options
- Three-layer merge: built-in defaults < file config < CLI overrides
- Supports: tier, timeout, webhookUrl, autoApproveGates, concurrency, maxRetries, etc.
- Implemented in `lib/config.js`

### Jest Coverage Configuration [DONE gen7]
- Coverage reporting enabled with thresholds: 80% lines/statements/functions, 60% branches
- Current coverage: 87.76% lines, 95.73% functions across all lib modules
- 328 total tests across 18 suites (up from 269 in 15 suites)

## Future Ideas

### Progress Bar
- Terminal progress bar showing which layer is active and overall progress
- Could use `ora` or similar terminal spinner library

### JSON Output Mode
- `--json` flag to CLI for machine-readable output
- Useful for piping into other tools or CI/CD integrations

### Dependency-Aware Parallel Building
- Analyze epic dependencies from L4 artifacts
- Only parallelize truly independent epics
- Topological sort for dependency ordering

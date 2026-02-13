# Ralph V3 Ideas & Roadmap

## Notifications & Observability

### Terminal Notifications (macOS)
- `osascript` push notifications at key events: layer transitions, review verdicts, stalls, completion
- Low effort, immediate value for local dev

### Stall Detection Watchdog
- Background thread monitoring `_status.md` last-modified time
- Alert if no update in N minutes (configurable, default 10)
- Would have caught both Chrome stalls during the skill tree meta-test

### Structured Event Log
- `_events.jsonl` alongside `_status.md` — machine-readable event stream
- Each event: `{ timestamp, type, layer, chunk, verdict, message }`
- Any tool can tail it for live updates

### Webhook Callback
- `--webhook <URL>` flag that POSTs JSON on state changes
- Slack, Discord, or local endpoint integration
- Payload: layer, chunk, verdict, iteration, blocker info

## Orchestrator Improvements

### Chunk Count Validation (BUG-001 fix)
- L5 completion should verify chunk folder count matches L4 outline
- L6 completion should verify all chunks have committed code
- L7 should verify all chunks have `_review.md` with PASS

### Subprocess Timeout (BUG-003 fix)
- Configurable timeout for Claude subprocess (default 15-20 min)
- Kill and retry on timeout, with event log entry
- `--timeout <seconds>` CLI flag

### Playwright MCP as Default Browser Testing
- Already swapped `/chrome` for Playwright MCP in prompts
- Consider detecting MCP availability before spawning review agents
- Fallback chain: Playwright MCP → curl/tests → code review only

### Resume / Recovery
- `ralph resume` command that reads `_status.md` and picks up where it left off
- Currently works implicitly (run just reads status) but should handle orphaned processes

## Methodology Ideas

### Parallel Chunk Building
- Chunks with no dependencies could be built in parallel (multiple Claude sessions)
- Would need a job queue and merge strategy

### Human-in-the-Loop Gates
- Optional approval gates between layers (like Layer Cake's L3/L7 gates)
- `--gate L5,L9` flag to pause and notify before proceeding

### Cost Tracking
- Track token usage per layer/iteration
- Report total cost at completion
- Help calibrate tier sizing (micro vs medium vs large)

### Project Templates
- `ralph init --template web-app` with pre-configured CLAUDE.md, chunk patterns, review criteria
- Templates for: web app, API, CLI tool, library

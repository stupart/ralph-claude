# Self-Improvement Brain Dump - Generation 5

**Date:** 2026-02-13
**Generation:** 5
**Goal:** Observability, stall detection, event logging, and remaining IDEAS.md items

## What's been accomplished (gen1-gen4)
- 12-layer pipeline fully validated
- GAN-style judge/builder loop working
- Per-epic builder scoping
- All 4 bugs fixed (BUG-001 through BUG-004)
- 116 jest tests across 6 suites
- Cost tracking per layer
- Anti-vagueness rules in planner prompts
- Good vs Bad example tables in planner and builder prompts
- Scope-limiting rules for builder
- /chrome fallback chains in all judge prompts
- normalizeAgentType for reviewer/judge naming
- README with Layer Cake documentation
- Self-improvement loop infrastructure

## What still needs work (from IDEAS.md)

### High Priority - Observability
1. **Stall detection watchdog** - Monitor _status.md last-modified time, alert if no update in N minutes. Would have caught both Chrome stalls during meta-test.
2. **Structured event log** - `_events.jsonl` alongside `_status.md` with machine-readable events: `{ timestamp, type, layer, epic, verdict, message }`. Any tool can tail it.
3. **Terminal notifications** - Use `terminal-notifier` (NOT osascript) for push notifications at key events: layer transitions, review verdicts, stalls, completion.

### Medium Priority - Orchestrator Hardening
4. **Subprocess timeout enforcement** - The JS layer has agentTimeout but it's not enforced with a proper kill signal. Add proper process kill + retry on timeout.
5. **Webhook callback** - `--webhook <URL>` flag for Slack/Discord integration. POST JSON on state changes.
6. **Project templates** - `ralph init --template web-app` with pre-configured CLAUDE.md and prompt patterns.

### Lower Priority - Methodology
7. **Parallel epic building** - Epics with no dependencies could run in parallel Claude sessions. Needs job queue and merge strategy.
8. **Resume improvements** - `ralph resume` should handle orphaned processes and stale locks.

## Improvement Targets for Gen5
1. Add EventLogger class to lib/ that writes `_events.jsonl` - emit from ralph.js on layer start/end, verdict, error, gate
2. Add StallDetector class that monitors _status.md mtime and fires callback after configurable threshold
3. Integrate terminal-notifier for macOS push notifications on key events
4. Add subprocess kill enforcement to ralph.js runLayerCycle timeout handler
5. Add webhook support to ralph.js (optional --webhook URL, POST on state changes)
6. Write tests for all new functionality
7. Update BUGS.md and IDEAS.md to reflect gen5 progress

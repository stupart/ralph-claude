# Layer Cake v9 Brain Dump: Self-Evolving Prompt System

## What this project is

Layer Cake is a 12-layer autonomous software improvement pipeline that plans, builds, reviews, and reflects. v8 shipped 3 epics (subtask batching, verdict compliance, layer-aware stall detection) with 1112 tests passing across 57 suites. v9 builds the autonomous prompt evolution loop — the system that makes Layer Cake improve its own prompts without human intervention.

## What already exists (just built, not yet tested at scale)

In the current codebase, the following A/B testing infrastructure was added but has never been run on a real pipeline:

- **`templates/agents/comparison-judge.md`** — A blind evaluation template. Receives two anonymized outputs (A and B), a layer type (planning/build/review/analysis), and returns Winner/Confidence/Reasoning. The comparison judge is the "referee" — it is never itself A/B tested.
- **`lib/ab-runner.js`** — `ABRunner` class. For a given layer, loads both the base template and a named variant, spawns two agents in parallel with the same context, randomizes which is A vs B to prevent position bias, spawns the comparison judge, parses Winner/Confidence/Reasoning from judge output, logs results to `_ab-results/evolution.jsonl`, and returns the winner's output as the layer result.
- **`bin/ab-test.js`** — CLI entry point: `node bin/ab-test.js --brain-dump <path> --variant vivid [--layers L3,L8] [--dry-run]`. Creates an isolated project directory (`_layer-cake-ab-{timestamp}/`), initializes Ralph, wraps the agent executor with A/B testing, runs the full pipeline, and prints a per-layer comparison summary at the end.
- **`lib/evolution-tracker.js`** — `EvolutionTracker` class. Reads `_ab-results/evolution.jsonl`, computes win rates per layer per variant, identifies promotion candidates (variants with >60% win rate across >=3 data points), and can report which layers have enough data to skip future A/B testing.
- **`bin/promote-winners.js`** — Reads evolution tracker output. For each promotion candidate: copies the variant to replace the base template, archives the old base to `templates/agents/archive/{name}.{date}.md`, logs the promotion to `_ab-results/promotions.jsonl`. Has `--dry-run` mode.
- **3 vivid variants** in `templates/agents/variants/`: `builder.vivid.md`, `judge-base.vivid.md`, `planner-base.vivid.md`. These use more colorful, metaphor-rich instructions ("craftsperson", "structural engineer", "strategic architect") compared to the more clinical base templates.

## What v9 must build: the autonomous evolution loop

The pieces above are manual — someone runs `ab-test.js`, waits, then runs `promote-winners.js`. v9 closes that loop into a fully autonomous overnight system. Here is the exact end behavior:

### End behavior: what the user experiences

The user runs one command:

```bash
ralph evolve --hours 8 --variant vivid
```

Or, for a scheduled overnight run:

```bash
ralph evolve --hours 8 --variant vivid --start-at 22:00
```

**What happens next (no human interaction required):**

1. The system selects a brain dump. It looks in `_evolution/brain-dumps/` for `.md` files. If multiple exist, it picks the one with the fewest prior runs (tracked in `_ab-results/evolution.jsonl` by matching the brain dump filename in each record). If no brain dumps exist, it auto-generates one using the existing `BrainDumpGenerator` from `lib/brain-dump-generator.js`, pulling from `BUGS.md`, `IDEAS.md`, and current test results — exactly like `run-loop.sh` does today but structured as a proper brain dump.

2. The system runs a full Layer Cake pipeline with A/B testing enabled. For each layer, both the base and variant prompts run in parallel, the comparison judge picks the winner, and the winner's output feeds into the next layer. All A/B results are logged to `_ab-results/evolution.jsonl` with fields: `{ timestamp, layerId, variant, baseIsA, anonymousWinner, actualWinner, confidence, reasoning, brainDumpFile }`.

3. After each pipeline run completes (or times out), the system checks the evolution tracker for promotion candidates. If any variant has won >60% of comparisons at a given layer across >=3 data points, the system automatically promotes it: copies the variant over the base template, archives the old base, logs the promotion. This happens between runs, not during.

4. The system starts the next pipeline run. It picks the next brain dump (or re-generates), and uses the now-updated templates (which may include freshly promoted variants). This means each successive run benefits from prior promotions.

5. The loop continues until the `--hours` time limit is reached. When the time limit approaches (within 30 minutes of the deadline), the system finishes the current pipeline run but does not start a new one. It never kills a mid-pipeline run.

6. When the loop ends, the system prints a final evolution report to stdout:
   - Total pipeline runs completed
   - Per-layer win rates for the variant
   - Promotions that occurred during the session
   - Current state of all templates (which are base, which were promoted from variants)
   - Comparison judge reliability: how often was confidence HIGH vs MEDIUM vs LOW

7. All artifacts are preserved:
   - `_ab-results/evolution.jsonl` — append-only log of every A/B comparison
   - `_ab-results/promotions.jsonl` — log of every template promotion
   - `_layer-cake-ab-{timestamp}/` directories — full pipeline artifacts from each run
   - `templates/agents/archive/` — old base templates that were replaced

### What the user sees the next morning

The user checks the terminal (or a log file if they used `nohup`/`caffeinate`) and sees something like:

```
=== Evolution Session Complete ===
Duration: 7h 42m
Pipeline runs: 4
Brain dumps used: 3

Per-layer results (vivid variant):
  L1:  3 wins / 4 runs (75%) — PROMOTED
  L2:  2 wins / 4 runs (50%) — not promoted (below threshold)
  L3:  3 wins / 3 runs (100%) — PROMOTED
  L8:  1 win  / 4 runs (25%) — not promoted (base is better)
  L9:  3 wins / 4 runs (75%) — PROMOTED
  L12: 2 wins / 2 runs (100%) — not promoted (need >=3 data points)

Promotions applied:
  planner-base.md ← planner-base.vivid.md (L1,L3 winner)
  judge-base.md ← judge-base.vivid.md (L9 winner)

Templates unchanged:
  builder.md (base outperformed vivid at L8)
```

The user's Layer Cake installation now has better prompts for planning and judging, data-driven by blind comparison. The builder prompt stayed as-is because the base was actually better.

## Architecture: how to build it

### Epic A: Evolution Runner (`bin/evolve.js` + `lib/evolution-runner.js`)

**The core loop module.** This is the main new code.

**`lib/evolution-runner.js`** — `EvolutionRunner` class:

- **Constructor** takes: `{ projectRoot, variant, hours, brainDumpDir, verbose }`.
- **`run()` method** — the main loop:
  1. Record `sessionStartTime = Date.now()`.
  2. Compute `deadline = sessionStartTime + (hours * 3600000)`.
  3. Loop: while `Date.now() + 1800000 < deadline` (30-min buffer):
     a. Call `selectBrainDump()` to pick the next brain dump.
     b. Create a timestamped project directory: `_layer-cake-ab-{iso-timestamp}/`.
     c. Copy the brain dump into `{projectDir}/1-input/brain-dump.md`.
     d. Initialize Ralph with the project directory.
     e. Create an agent executor (same pattern as `ab-test.js`).
     f. Create an `ABRunner` with the current variant and wrap the executor.
     g. Run `ralph.runProject(wrappedExecutor)` with `autoApproveGates: true` (no human gates in overnight mode).
     h. After the run completes, call `checkAndPromote()` to promote any winners.
     i. Log the run result (completed, errored, timed out) to a session log.
  4. After the loop ends, call `generateReport()` and print it.

- **`selectBrainDump()` method:**
  1. Read all `.md` files from `_evolution/brain-dumps/`.
  2. Read `_ab-results/evolution.jsonl` and count how many times each brain dump file appears.
  3. Return the brain dump with the fewest prior runs.
  4. If `_evolution/brain-dumps/` is empty or doesn't exist, call `autoGenerateBrainDump()`.

- **`autoGenerateBrainDump()` method:**
  1. Use `BrainDumpGenerator` from `lib/brain-dump-generator.js`.
  2. Pass it the current test results (run `npx jest --json` and parse), `BUGS.md`, `IDEAS.md`.
  3. Write the generated brain dump to `_evolution/brain-dumps/auto-{timestamp}.md`.
  4. Return the path.

- **`checkAndPromote()` method:**
  1. Instantiate `EvolutionTracker`.
  2. Call `getPromotionCandidates()`.
  3. For each candidate that hasn't already been promoted this session (track in a Set):
     - Copy variant → base template.
     - Archive old base → `templates/agents/archive/`.
     - Log to `_ab-results/promotions.jsonl`.
     - Add to the session's promoted Set so we don't double-promote.

- **`generateReport()` method:**
  1. Read all evolution records from this session (filter by `timestamp >= sessionStartTime`).
  2. Compute per-layer win rates.
  3. List promotions that occurred.
  4. List unchanged templates with reasons.
  5. Return formatted string for stdout.

**`bin/evolve.js`** — CLI entry point:

```
node bin/evolve.js --variant <name> --hours <n> [options]

Options:
  --variant <name>    Variant to test (required)
  --hours <n>         How long to run (required)
  --start-at <HH:MM>  Delay start until this time (optional)
  --brain-dumps <dir>  Brain dump directory (default: _evolution/brain-dumps/)
  --timeout <ms>       Per-agent timeout (default: 1800000)
  --max-turns <n>      Max turns per agent (default: unlimited)
  --quiet              Suppress per-agent output
```

When `--start-at` is provided: calculate the delay in milliseconds from now until that time today (or tomorrow if the time has passed), sleep for that duration, then start the evolution loop. Print a message like "Waiting until 22:00 to start (3h 14m from now)..."

**Integration with `ralph-cli.js`:** Add `evolve` as a subcommand in `bin/ralph-cli.js`. The handler should just call `EvolutionRunner.run()` with the parsed options. This is 10-15 lines in the CLI's switch statement — same pattern as `run`, `status`, etc.

### Epic B: Evolution Data Enhancements

**The A/B infrastructure exists but needs improvements for overnight reliability.**

1. **Add `brainDumpFile` field to evolution records.** Currently `ab-runner.js:logResult()` logs layer, variant, winner, confidence, reasoning. Add the brain dump filename so the evolution tracker can count runs per brain dump. This is a 1-line change in `ABRunner.logResult()` — pass it as an option when constructing `ABRunner`: `options.brainDumpFile`.

2. **Add session ID to evolution records.** Generate a UUID or timestamp-based session ID in `EvolutionRunner` and pass it through to `ABRunner`. This lets the report filter records to "this session only" vs "all time". Add `sessionId` field to `ABRunner.logResult()`.

3. **Handle comparison judge failures gracefully.** Currently if the comparison judge agent crashes, `ab-runner.js` catches the error and sets `judgeResult = { output: '' }`, which `parseComparisonResult()` turns into `{ winner: 'TIE', confidence: 'LOW' }`. This is correct behavior — a tie means "use either output." But log a warning event to `_ab-results/evolution.jsonl` with `{ type: 'judge_error', error: message }` so the report can flag unreliable comparisons.

4. **Add elapsed time tracking per A/B comparison.** Record how long each dual-agent run takes (both agents + judge). This lets the report estimate total time per pipeline run and predict how many runs fit in the `--hours` window. Add `durationMs` to the evolution record.

5. **Timeout safety for the evolution loop.** The `EvolutionRunner` must handle the case where a pipeline run exceeds the remaining time budget. Approach: pass a per-pipeline timeout to Ralph's `agentTimeout` option. Calculate it as `Math.min(opts.timeout, deadline - Date.now() - 300000)` (leave 5 minutes for cleanup). If the timeout fires mid-layer, Ralph's existing graceful shutdown handles it.

### Epic C: Brain Dump Seeding

**The system needs brain dumps to test against. Create a starter set.**

1. **Create `_evolution/brain-dumps/` directory** with 3-5 small, diverse brain dumps that exercise different parts of the pipeline. These should be real tasks that Layer Cake can actually complete, not toy examples. Suggested brain dumps:

   a. **`improve-error-messages.md`** — "Audit all `throw new Error()` calls in `lib/*.js`. Replace generic messages with specific, actionable ones that include the variable values that caused the error. Add the filename and line context. Do NOT change error handling logic, only the message strings."

   b. **`add-jsdoc-to-public-api.md`** — "Add JSDoc comments to all exported functions in `lib/ralph.js`, `lib/agent-spawner.js`, and `lib/state-machine.js`. Each function needs: description, @param types and descriptions, @returns type and description, @throws conditions. Do NOT modify any function implementations."

   c. **`test-coverage-gaps.md`** — "Run `npx jest --coverage` and identify the 5 files with the lowest branch coverage. For each file, add tests that cover the uncovered branches. Target: every file in `lib/` should have >80% branch coverage. Do NOT modify source files, only add test files."

   d. **`readme-accuracy-audit.md`** — "Read README.md and verify every claim against the actual codebase. Fix any outdated command examples, wrong file paths, incorrect feature descriptions, or missing capabilities. Update the Architecture section to reflect the current module structure. Do NOT add new sections, only fix existing content."

   e. **`config-validation.md`** — "Add input validation to `lib/config.js` for all configuration keys. Currently unknown keys are silently ignored and invalid values (negative timeouts, non-string webhookUrls, etc.) are accepted. Add validation with clear error messages. Add tests for all validation rules."

2. **Each brain dump must follow the format** that Layer Cake's L1 (Input) layer expects: a markdown file with clear sections describing the task, constraints, and success criteria. The v8 brain dump is the gold standard for format — follow its structure of "What this project is", "The problem", "What to fix", "What NOT to do".

### Epic D: Launchd Integration (Optional — for truly unattended overnight runs)

**A launchd plist so the user can schedule evolution runs like cron jobs.**

1. **Create `support/com.ralph-claude.evolve.plist`** — A launchd plist that:
   - Runs `node bin/evolve.js --variant vivid --hours 8 --quiet` at 22:00 daily
   - Sets `WorkingDirectory` to the ralph-claude project root
   - Redirects stdout/stderr to `_evolution/logs/evolve-{date}.log`
   - Uses `StartCalendarInterval` with `Hour: 22, Minute: 0`
   - Sets `Nice: 10` (lower priority than interactive work)
   - Does NOT use `KeepAlive` (run once per trigger, not continuously)
   - Sets `RALPH_EVOLVE=1` environment variable (for detection in code)

2. **Create `bin/install-schedule.sh`** — A helper script that:
   - Copies the plist to `~/Library/LaunchAgents/`
   - Substitutes `{{RALPH_ROOT}}` in the plist with the actual project path
   - Runs `launchctl load` to activate
   - Prints confirmation with the schedule and log location
   - Has `--uninstall` flag to `launchctl unload` and remove the plist

3. **Create `bin/uninstall-schedule.sh`** — Reverse of install: unload and remove plist.

## Execution constraints

- The evolution runner uses `runProject()` with per-epic cycling and `autoApproveGates: true` — no human gates in autonomous mode.
- Each pipeline run gets its own isolated project directory (`_layer-cake-ab-{timestamp}/`). Pipeline artifacts are never shared between runs.
- Template promotions happen between runs, never during. Mid-run template changes would create inconsistency.
- The comparison judge always uses `opus` model. It is the referee and is never A/B tested itself.
- The `--hours` time limit is a soft limit: the system finishes the current run but won't start a new one within 30 minutes of the deadline.
- Brain dump rotation ensures no single task dominates. Each brain dump gets roughly equal testing time.
- The `_ab-results/` directory is append-only. Never delete or truncate `evolution.jsonl` or `promotions.jsonl`. The evolution tracker handles large files fine (it's just line-by-line JSON parsing).
- All agents run with `opus` model as per `AGENT_MODEL` constant. Do not introduce model selection — this is a known requirement from the v7 post-mortem (Haiku was accidentally used and produced inferior results).

## What NOT to do

- Do NOT modify `lib/ab-runner.js` core logic (dual-prompt execution, randomization, comparison judge spawning). It was just built and tested. Only add new fields to `logResult()`.
- Do NOT modify `lib/evolution-tracker.js` win rate computation. The >60% threshold and >=3 minimum are intentional. Only add new query methods if needed.
- Do NOT modify `templates/agents/comparison-judge.md`. The comparison judge is the fixed referee. Changing it would invalidate all prior evolution data.
- Do NOT modify the existing `run-layer-cake-on-self.js` or `run-loop.sh` — they serve different purposes (single pipeline run and simple self-improvement loop respectively).
- Do NOT create a "meta-comparison-judge" that A/B tests the comparison judge. This creates an infinite regress. The comparison judge's quality is validated by reviewing its reasoning in `evolution.jsonl`, not by automated testing.
- Do NOT store raw agent outputs in `evolution.jsonl`. The file would grow enormous. Only store metadata (winner, confidence, reasoning, durations, lengths). The full outputs live in the per-run project directories.
- Do NOT run more than 2 agents in parallel per layer. The system already runs base + variant simultaneously. Adding more variants per run would make comparison ambiguous (which pair are you comparing?). Instead, run multiple sessions with different `--variant` flags.
- Do NOT add `caffeinate` to the evolve script — let the user wrap it: `caffeinate -i node bin/evolve.js ...`. Don't force macOS-specific behavior.

## Success criteria

After v9 is complete, the user should be able to:

1. Run `node bin/evolve.js --variant vivid --hours 8` and walk away.
2. Come back to find: multiple pipeline runs completed, evolution data logged, and (if the variant was genuinely better) template promotions applied automatically.
3. Run `node bin/promote-winners.js --dry-run` to see current standings without making changes.
4. Add new brain dumps to `_evolution/brain-dumps/` and new variants to `templates/agents/variants/` to expand the evolution pool.
5. Check `_ab-results/evolution.jsonl` for the full history of every A/B comparison ever run.
6. Optionally install the launchd plist for nightly scheduled runs.

## Test expectations

The build should add tests for:
- `EvolutionRunner` — brain dump selection, promotion logic, time budget enforcement, report generation
- `evolve` CLI — argument parsing, `--start-at` delay calculation
- Integration: mock pipeline run → evolution record → promotion check
- Brain dump selection: picks least-tested, handles empty directory, handles auto-generation
- Time budget: stops before deadline, doesn't start new run within 30-min buffer

Target: all existing 1112 tests continue to pass, plus new tests for the evolution runner.

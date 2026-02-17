# Layer Cake TUI Dashboard: Living Blueprint Visualization

## The vision in the user's own words

> "Who cares L1 L2 L3, those are like numbers for bullets. I also need to know what exactly is happening there, what the subthings are, what AIs are doing it, the loops, judges, reviews, tasks, subtasks. It's a living breathing system and I want to see its beauty via a profoundly intuitive and useful interface."

> "Video game type visualization so you can see what it's doing, correct course if necessary, intervene, see obvious bugs — all real time."

> "Include the actors (AI agents) in the visualization like a real service blueprint. Also make the events as dense as possible so the bandwidth is super high."

> "Aim for something that is elegantly simple yet profoundly useful."

> "Tasteful UI, real character, real brand."

These are not suggestions — they are requirements. Every design choice should trace back to these words.

## What this project is

A real-time terminal dashboard for Layer Cake pipeline runs. It transposes the existing HTML service blueprint (`docs/v3-system-blueprint.html`) into a live, interactive terminal experience. You watch the pipeline breathe — agents spawning, producing, handing off, reviewing, iterating — as it happens.

The service blueprint is currently a static HTML document with swim lanes for each actor (Ralph, Planner, Builder, Judge, Human), a 12-column grid for layers, and cascade routing arrows. This TUI makes that blueprint come alive. The same actors, the same colors, the same structure — but now you see work flowing through it in real time.

## What already exists

### Data sources the TUI consumes

**Ralph event emitter** (in-process, `lib/ralph.js`): 11 events fired during pipeline execution:
- `onLayerStart` — layer beginning, with position (layer, epic, feature, task, iteration)
- `onLayerComplete` — layer done, with next layer target
- `onAgentSpawn` — agent being launched, with full spawn config
- `onValidationResult` — validator ran, with pass/fail and issue list
- `onRoutingDecision` — router resolved a verdict, with cascade target
- `onHumanGateRequired` — pipeline paused waiting for human approval
- `onGateTimeout` — gate wait time exceeded
- `onGateRejection` — human rejected a gate, with feedback
- `onCostUpdate` — token usage recorded (input/output per layer, running totals)
- `onError` — any error (stall, cascade depth, agent crash)
- `pipeline_complete` — project finished

**`_events.jsonl`** (file-based, one JSON per line): Same events persisted to disk. Types include `layer_start`, `layer_end`, `verdict`, `error`, `gate_approval`, `gate_waiting`, `stall_detected`, `cost_update`, `agent_complete`, `layer_timing`, `agent_retry`, `cascade_depth_exceeded`, `partial_completion`. Each line has: `{ timestamp, type, layer, epic, verdict, message, meta }`.

**`_status.md`** (file-based, polled): Human-readable Markdown with the current position — layer, layer name, phase, agent type, epic, feature, task, iteration, gate statuses, and a progress checklist.

### Brand identity

The brand palette is defined in `docs/v3-system-blueprint.html` CSS:
- Ralph (orchestrator): #ff6b35 — warm orange, the system's signature color
- Planner: #10b981 — emerald green, growth and planning
- Builder: #3b82f6 — blue, construction and precision
- Judge/Reviewer: #8b5cf6 — purple, scrutiny and wisdom
- Human: #f59e0b — amber, warmth and authority
- Pass: #22c55e — green, success
- Fail: #ef4444 — red, attention needed
- Background: #1a1a1a — near-black
- Foreground: #fafafa — near-white

### Existing CLI

`bin/ralph-cli.js` already has subcommands: `init`, `run`, `status`, `resume`, `cost`, `evolve`, `prompts`, `help`. The TUI adds `watch` and a `--tui` flag on `run`.

### Existing notification systems

- `lib/notifier.js` — macOS `terminal-notifier` push notifications (layer transitions, verdicts, stalls, errors, completion)
- `lib/webhook.js` — HTTP POST to external URLs (Slack, Discord)

The TUI is a third channel alongside these. All three can run simultaneously.

## What v10 must build: the experience

### What you see when you launch

Two ways to start:

**Watch mode (read-only, any running pipeline):**
```bash
ralph watch _layer-cake-v9
```
You open a second terminal, point it at a project directory, and immediately see the pipeline's current state and a scrolling feed of everything that's happened. You can watch without touching. The pipeline doesn't know you're watching.

**Integrated mode (full control):**
```bash
ralph run --tui --auto-approve
```
The pipeline runs inside the TUI. You see everything AND you can interact — pause, resume, approve gates, deny with feedback. The TUI IS the pipeline interface.

Both modes render the same visualization. The only difference is the data source (file tailing vs in-process events) and whether interactive controls work.

### The visualization: a living, breathing service blueprint

#### Actors — the soul of the system

This is NOT a generic progress bar. There are distinct AI actors doing different things, and you should always know WHO is working and WHAT they're doing.

The actors from the service blueprint, always visible:

| Actor | Color | What they do |
|---|---|---|
| Ralph | #ff6b35 orange | Orchestrates: routes between layers, handles cascades, manages retries, tracks costs |
| Planner | #10b981 emerald | Plans: decomposes requirements, defines epics/features/tasks/subtasks, synthesizes |
| Builder | #3b82f6 blue | Builds: writes code, runs tests, commits — one epic at a time, one feature at a time |
| Judge | #8b5cf6 purple | Reviews: inspects outputs, finds issues, classifies severity, renders verdicts |
| Human | #f59e0b amber | Approves: gates at synthesis (L3) and plan completion (L7), can pause/intervene anytime |

Each actor should have visual presence even when idle — dimmed but there, like an instrument in an orchestra waiting for its cue. When an actor becomes active, it lights up. When they hand off to the next actor, you should see the flow.

The active actor is the star of the current moment. Their color should dominate the activity section. Their name, their role, what specifically they're working on — all visible at a glance.

#### The pipeline — not numbers, meaning

"L1 L2 L3" are meaningless labels. Here's what each layer actually IS:

| Layer | Name | Actor | What's actually happening |
|---|---|---|---|
| L1 | Input Gathering | Planner | Reading the brain dump, collecting context, understanding what to build |
| L2 | Decomposition | Planner | Breaking down requirements into Jobs To Be Done |
| L3 | Synthesis | Planner | Synthesizing everything into a coherent project understanding → **HUMAN GATE** |
| L4 | Epic Definition | Planner | Defining major epics (independent workstreams) |
| L5 | Feature Planning | Planner | Breaking epics into features with acceptance criteria |
| L6 | Task Specification | Planner | Breaking features into implementation tasks |
| L7 | Subtask Definition | Planner | Defining atomic subtasks within each task → **HUMAN GATE** |
| L8 | Build | Builder | Implementing code — cycles through each epic, each feature within each epic |
| L9 | Feature Review | Judge | Reviews each completed feature against its acceptance criteria |
| L10 | Epic Review | Judge | Reviews each completed epic holistically — all features together |
| L11 | Final Review | Judge | Reviews the entire project — everything together |
| L12 | Retrospective | Planner | Analyzes what went well, what didn't, waste ratio, recommendations |

The visualization should show these real names, not layer numbers. When L6 is active, you should see "Task Specification" and know the planner is breaking features into tasks. When L9 is active, you should see "Feature Review" and know the judge is scrutinizing a specific feature.

#### The nesting — this is where the beauty is

Layer Cake is not a flat sequence. It's a nested, looping, adversarial system:

**The build layer (L8) cycles through epics:**
```
Epic 1: epic-auth
  Feature F001: User registration → Builder writes code → Judge (L9) reviews
    PASS → next feature
  Feature F002: Login flow → Builder writes code → Judge (L9) reviews
    ITERATE (2 issues) → Builder rewrites → Judge reviews again
    PASS → next feature
  All features done → Judge (L10) reviews entire epic
  PASS → next epic

Epic 2: epic-api
  ... same cycle ...
```

This nesting should be VISIBLE. Not "L8 is running." Instead: "Builder: epic-auth / F002 / T003 — iteration 2". You should see the current depth: which epic, which feature within it, which task within that, which iteration.

**The review loop is the heartbeat:**
- Builder produces → Judge reviews → verdict
- PASS: advance to next feature/epic/layer
- ITERATE with MINOR issues: rebuild the feature (goes back to L8 for that feature)
- ITERATE with MAJOR issues: cascade deeper — maybe replan tasks (L6) or features (L5)
- ESCALATE: cascade even deeper — redefine epics (L4) or re-synthesize (L3)

When a judge says ITERATE, you should see exactly what happened: which issues were found, what severity, where the cascade routes to, and then watch the system loop back and try again. This is the GAN-style adversarial loop — the builder and judge are in tension, and watching that tension play out is one of the most compelling aspects of the system.

**Cascade routing visualization:**
When a verdict triggers a cascade, the pipeline strip should show it — an arrow or loop indicator from the review layer back to the target layer. You should see: "ITERATE: 2 major issues → rebuilding from Task Specification (L6)". The cascade is not a failure — it's the system self-correcting. Show it with character.

#### Dense event feed — Bloomberg terminal density

Every event in the log should pack maximum information into minimum space. No blank lines. No decorative padding. Every pixel of vertical space is data.

Think about what information is useful per event:
- **When**: timestamp (HH:MM:SS, not full ISO)
- **Who**: actor color-badge (a small colored indicator before the text)
- **Where**: layer name + epic/feature/task context
- **What**: the action, with key metrics inline

Examples of dense event lines (one per event):
```
11:42:31 ▐ Planner  Subtask Definition complete (4m 12s)
11:42:31 ▐ Ralph    Route: L7 → L8 Build
11:42:35 ▐ Builder  Spawned for epic-auth / F003 / T002 (iter 1)
11:43:12 ▐ Builder  Cost: +2.1k in / +800 out (total: 45.2k/18.1k)
11:47:01 ▐ Judge    Feature Review: PASS (1 issue, 0 major) — F003 complete
11:47:02 ▐ Ralph    Route: next feature F004
11:52:18 ▐ Judge    Feature Review: ITERATE (3 issues: 2 major, 1 minor)
11:52:18 ▐ Ralph    Cascade: MAJOR → rebuild from Task Spec (L6)
11:52:19 ▐ Planner  Spawned for L6 Task Specification (epic-auth/F004, iter 2)
12:01:44 ▐ Judge    Epic Review: PASS (1 issue) — epic-auth complete (3/4 epics done)
12:01:45 ▐ Human    Gate waiting: Plan Approval (L7) — press 'a' to approve
```

The ▐ character (or similar) is colored by actor. You can scan the left edge of the log and see the actor sequence just by color pattern, without reading a word.

When A/B testing is running alongside, the events should include evolution data inline:
```
11:42:35 ▐ A/B     L8 dual spawn: base vs vivid (builder)
11:47:01 ▐ A/B     L9 comparison: vivid wins (HIGH) — "richer issue descriptions, same accuracy"
```

#### The pipeline strip — visual heartbeat

A compact horizontal strip showing all 12 layers at once. This is the "glanceable" view — you should be able to look at just this strip and know exactly where things are.

Each cell represents a layer. Visual states:
- **Done**: colored by agent type (emerald/blue/purple), dimmed, with a check mark
- **Active**: colored brightly with an animated indicator (spinner or shimmer)
- **Pending**: gray, dot or dash
- **Iterating**: red or amber, with a loop indicator
- **Gate waiting**: amber, pulsing

Sub-progress should be visible: "Epic 2/4" or "Feature 3/7" under the active cell.

The strip tells a story at a glance: seven green checks, one pulsing blue active cell, four gray pending dots = "we're in the build phase, about 60% through planning."

#### Interactivity — correct course, intervene

The TUI should respond to keyboard input. This is not a passive display — it's a control surface.

| Key | What it does |
|---|---|
| `q` | Quit the TUI (in watch mode, pipeline keeps running; in integrated mode, pipeline keeps running in background) |
| `p` | Pause the pipeline (integrated mode only) — freezes after current agent finishes |
| `r` | Resume after pause |
| `a` | Approve a gate (when Human actor is waiting) — unblocks the pipeline |
| `d` | Deny a gate — sends feedback, pipeline cascades back to re-plan |
| `j`/`k` | Scroll the event log up/down (for reviewing history) |
| `l` | Toggle layer detail overlay — shows what artifacts each layer produced |
| `c` | Toggle cost overlay — per-layer token usage breakdown |
| `?` | Toggle help overlay |

The overlays are modal — they appear over the main view, dimming the background. Press the same key or Escape to dismiss.

The **layer detail overlay** shows what happened at a specific layer: which agent ran, how long it took, what it produced (file list), what the verdict was, what issues were found. This is for "see obvious bugs" — if the judge found issues, you can read them right here without digging through files.

The **cost overlay** shows cumulative token usage per layer and per agent. This is for understanding where the pipeline spends its budget.

### Constraints — hard requirements

- **Zero npm dependencies**: raw ANSI escape codes only. No blessed, no ink, no chalk, no nothing. The project has zero npm dependencies and this TUI should not be the first. Use `\x1b[` sequences directly, `process.stdout.write`, `process.stdin.setRawMode`.
- **True color (24-bit)**: `\x1b[38;2;R;G;Bm` for the brand palette. These are specific hex colors from the blueprint — approximating them with 16-color ANSI would lose the brand identity.
- **Alternate screen buffer**: `\x1b[?1049h` on start, `\x1b[?1049l` on exit. The terminal should restore perfectly when the TUI exits — cursor visible, echo on, main buffer restored. No terminal corruption, ever.
- **Graceful resize**: listen to `SIGWINCH`, re-render when terminal dimensions change. Don't crash on small terminals — degrade gracefully (hide less critical sections).
- **Clean exit on any signal**: SIGINT, SIGTERM, `q` key — all should restore the terminal cleanly.

### Integration with existing systems

The TUI integrates via two paths:

**Watch mode** (file-based):
- Tail `_events.jsonl` using `fs.watch` for near-instant event pickup
- Poll `_status.md` every ~1 second for position updates
- On startup, replay existing events to rebuild current state (pipeline strip, event log)
- Read-only — no side effects on the running pipeline

**Integrated mode** (in-process):
- Attach handlers to Ralph's event emitter before calling `runProject()`
- Handle gate approval/denial through TUI keyboard → resolve/reject Ralph's gate promises
- Pause/resume by signaling the active agent child process
- Full bidirectional control

Both modes render the same TUI layout. The only difference is which data source drives the updates.

### CLI integration

Two new entry points in `bin/ralph-cli.js`:

1. **`ralph watch [project-dir]`** — standalone watcher mode
2. **`ralph run --tui`** — integrated mode, adds `--tui` flag to existing `run` subcommand

These sit alongside existing subcommands (init, run, status, resume, cost, evolve, prompts).

## What NOT to build

- Don't build a web server or browser-based UI
- Don't add npm dependencies
- Don't build a generic TUI framework — this is purpose-built for Layer Cake
- Don't over-abstract the renderer — it's OK for the TUI code to know about layers, epics, and agents specifically
- Don't build a configuration system for the TUI — it should work out of the box with sensible defaults
- Don't add logging to the TUI itself — it IS the logging interface

## What success looks like

You run `ralph watch` on a pipeline that's already running. Within 1 second you see: which layer is active, which actor is working, what epic/feature/task they're on, the event history scrolling by with dense, colorful, information-rich lines. You glance at the pipeline strip and instantly know progress. You press `l` and see what the judge found in the last review. You press `c` and see token costs per layer. You press `q` and the terminal returns to normal as if nothing happened.

It's elegant. It's dense. It's useful. It shows the living, breathing, looping, adversarial beauty of the system — the planner designing, the builder building, the judge scrutinizing, Ralph routing, the human approving. Five actors, twelve layers, nested loops, all visible at once.

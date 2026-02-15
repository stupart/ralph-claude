# ralph-claude

A minimal Rust CLI for running Claude Code in autonomous loops until your PRD is complete.

Based on the [Ralph Wiggum Technique](https://github.com/ghuntley/how-to-ralph-wiggum) by Geoffrey Huntley, with additions from:
- [Anthropic's harness patterns](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Thariq's interview technique](https://x.com/trq212/status/2005315279455142243)
- [Boris Cherny's verification philosophy](https://x.com/bcherny)

## Philosophy

> "Ralph isn't just 'a loop that codes.' It's a funnel with 3 Phases, 2 Prompts, and 1 Loop."

The key insight: **fresh context per iteration**, with state persisted to files + git. Each loop starts clean, reads the current state, does one thing, commits, and exits.

## Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — Anthropic's CLI for Claude (`claude` command)
- **[Node.js](https://nodejs.org/)** v18+ — for the JS orchestration layer
- **Git** — for version control
- **caffeinate** (macOS only, built-in) — for unattended runs

> **Note:** The original Rust CLI (`cargo install --path .`) is deprecated.
> The Node.js orchestration layer in `lib/` is the active implementation with
> full plugin support, cost tracking, parallel execution, and more.
> See the "JS Orchestration" section below for usage.

## Install

```bash
git clone https://github.com/stupart/ralph-claude.git
cd ralph-claude
npx ralph status
```

## Quick Start

```bash
ralph myproject
```

That's it. One command does everything:
1. Creates `myproject/` folder
2. Initializes ralph templates
3. Prompts for brain dump (optional context)
4. Interviews you about what to build
5. Runs autonomous build loop until complete

---

## Usage

### New Project

```bash
ralph myproject
```

Creates folder → init → brain dump prompt → interview → build loop.

### Existing Folder

```bash
cd my-existing-app
ralph
```

Initializes ralph (if needed) → brain dump prompt (if new) → interview (if PRD empty) → build loop.

### Continue Where You Left Off

```bash
cd my-ralph-project
ralph
```

If already initialized with features in PRD, goes straight to the build loop.

---

## What Happens

```
$ ralph myproject

Created myproject/
Initializing ralph project...
  init git repository
  create CLAUDE.md
  create PRD.json
  create progress.md
  create guardrails.md
  create .claude/settings.json
  create .claude/commands/interview.md
  create .claude/commands/plan.md
  create .claude/commands/build.md
  create .claude/commands/ralph.md

Brain dump?
(Paste any context, ideas, links, references - press Enter twice when done, or just Enter to skip)
> I want a CLI tool like ripgrep but for JSON
> should support jq-like queries but simpler
> must be fast, written in Rust
>
>

  create docs/brain-dump-001-2026-01-21.md

Setup complete!

PRD is empty. Starting interview...
[Claude interviews you, asks 20-50 questions]

Interview complete. Starting build loop...

[23:45:01] Iteration 1
  PRD status: 0/5
[Claude implements F000: Project Setup]

[23:47:23] Iteration 2
  PRD status: 1/5
[Claude implements F001: ...]

...

All features passing! PRD complete.
Ralph loop finished.
```

---

## Brain Dump

The brain dump is your chance to front-load context before the interview. Good brain dumps include:

- **What you're building** (even if vague)
- **Inspiration/references** ("like X but simpler")
- **Technical constraints** ("must work offline", "no external deps")
- **Links** to docs, designs, similar projects
- **Anti-patterns** ("don't use Redux", "avoid class components")
- **Context** about existing code ("auth is fragile, don't touch")

Brain dumps are saved as numbered, dated files:
```
docs/brain-dump-001-2026-01-21.md
docs/brain-dump-002-2026-01-22.md
```

The interview reads ALL brain dumps, so you can add more context later by creating additional files.

---

## Running Unattended (macOS)

Prevent your Mac from sleeping while Ralph runs:

```bash
caffeinate -is ralph myproject
```

Flags:
- `-i` — prevent idle sleep
- `-s` — prevent system sleep (lid close, AC power only)
- `-d` — prevent display sleep

For maximum persistence (AC + battery):
```bash
caffeinate -ims ralph myproject
```

---

## Command Reference

```
ralph [PROJECT_NAME] [OPTIONS]

Arguments:
  [PROJECT_NAME]         Creates/enters this folder (optional)

Options:
  -p, --prompt <FILE>    Prompt file [default: .claude/commands/ralph.md]
      --prd <FILE>       PRD file [default: PRD.json]
  -m, --max-iterations   Max iterations, 0 = unlimited [default: 0]
  -d, --delay <SECS>     Delay between iterations [default: 2]
      --dry-run          Show what would run without executing
  -h, --help             Print help
```

---

## PRD Structure

```json
{
  "project": "My Project",
  "features": [
    {
      "id": "F001",
      "name": "User Authentication",
      "description": "JWT-based auth with refresh tokens",
      "status": "pending",
      "acceptance_criteria": [
        "User can register with email/password",
        "User can login and receive JWT",
        "Protected routes reject invalid tokens"
      ]
    }
  ]
}
```

Status values: `pending` → `inprogress` → `failing` → `passing`

Only mark "passing" when ALL acceptance criteria are verified.

---

## Verification (Critical)

From Boris Cherny: "Give Claude a way to verify its work - this 2-3x the quality."

Every feature must be verified before marking complete:
- **Web apps**: Use `/chrome` to test UI (Claude controls a browser)
- **APIs**: Run actual requests, test error cases
- **All code**: Tests pass, typecheck passes, lint passes

### Using `/chrome` for UI Testing

```bash
# In Claude Code
/chrome http://localhost:3000
```

Claude will open a browser and can click through UI flows, fill forms, verify rendering, test edge cases.

---

## Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project guidelines, verification rules |
| `PRD.json` | Feature list with status tracking |
| `progress.md` | Append-only log of completed work |
| `guardrails.md` | Hard rules (never commit failing tests, etc.) |
| `plan.md` | Current implementation plan (generated) |
| `docs/brain-dump-NNN-YYYY-MM-DD.md` | Numbered & dated context dumps |
| `.claude/settings.json` | Permission rules |
| `.claude/commands/*.md` | Claude Code slash commands |

---

## Layer Cake: 12-Layer Planning and Build Pipeline

Layer Cake is the structured methodology that decomposes a project through 12 layers using specialized agents (Planner, Builder, Judge) in a GAN-style adversarial loop.

### The 12 Layers

| Layer | Name | Agent | Phase |
|-------|------|-------|-------|
| L1 | Input | Planner | Understand |
| L2 | Decompose | Planner | Understand |
| L3 | Synthesize | Planner | Understand |
| L4 | Epic Definition | Planner | Plan |
| L5 | Feature Planning | Planner | Plan |
| L6 | Task Specification | Planner | Plan |
| L7 | Subtask Definition | Planner | Plan |
| L8 | Build | Builder | Build |
| L9 | Feature Review | Judge | Review |
| L10 | Epic Review | Judge | Review |
| L11 | Final Review | Judge | Review |
| L12 | Analysis | Planner | Learn |

Human approval gates exist at L3 (after synthesis) and L7 (after full plan).

### JS Orchestration

The `lib/` directory contains the Node.js orchestration layer:

```
lib/
  ralph.js              - Main orchestrator: spawns agents, validates, routes
  state-machine.js      - Manages _status.md and layer transitions (with file locking)
  validator.js          - Enforces minimum counts and required sections
  router.js             - Routes Judge verdicts (PASS/ITERATE) with cascade rules
  agent-spawner.js      - Assembles prompts and tool permissions (with template caching)
  recovery.js           - Reconciles state with filesystem on startup
  parallel-executor.js  - Concurrent epic building with bounded work queue
  config.js             - Config file support (ralph.config.json / .ralphrc)
```

### Using the JS Layer

```javascript
const { Ralph } = require('./lib/ralph');

const ralph = new Ralph('/path/to/project', {
  tier: 'small',         // small | micro | medium | large
  autoApproveGates: false,
  agentTimeout: 300000,  // 5 min timeout per agent
  maxRetries: 3          // retry crashed agents with exponential backoff
});

await ralph.initialize();

// Run one layer at a time
const result = await ralph.runLayerCycle(async (spawnConfig) => {
  // Execute agent using spawnConfig.prompt, spawnConfig.permissions, etc.
  // Return artifacts including optional tokenUsage: { inputTokens, outputTokens }
  return { tokenUsage: { inputTokens: 2000, outputTokens: 1000 } };
});

// Or run the full project
await ralph.runProject(agentExecutor);

// Or run epics in parallel
const { ParallelExecutor } = require('./lib/parallel-executor');
const parallel = new ParallelExecutor(ralph, agentExecutor, { concurrency: 2 });
const epicResults = await parallel.runEpics(['epic-auth', 'epic-api', 'epic-ui']);

// Check cost tracking
const status = await ralph.getStatus();
console.log(status.costs);  // { layers: {...}, totals: { inputTokens, outputTokens, calls } }
```

### Configuration

Create `ralph.config.json` or `.ralphrc` in your project root:

```json
{
  "tier": "medium",
  "timeout": 600000,
  "concurrency": 3,
  "autoApproveGates": false,
  "webhookUrl": "https://hooks.slack.com/services/...",
  "maxRetries": 3
}
```

### Running Tests

```bash
npx jest --config jest.config.js --forceExit
npx jest --config jest.config.js --coverage --forceExit  # with coverage report
```

Runs 1054 tests across 50 suites covering all orchestration modules.

---

## Tips

- **Start small**: Begin with 1-2 features, add more as they complete
- **Be specific**: Vague acceptance criteria = vague implementation
- **Use brain dumps**: Even rough notes help Claude ask better questions
- **Trust the loop**: Each iteration is fresh - if one fails, the next can try differently
- **Check progress.md**: See what's been done across sessions
- **Use `--max-iterations`**: Limit runs while testing your setup

---

## Credits

- [Geoffrey Huntley](https://github.com/ghuntley) - Original Ralph Wiggum Technique
- [Anthropic](https://anthropic.com) - Claude Code and harness patterns
- [Thariq](https://x.com/trq212) - Interview prompt technique
- [Boris Cherny](https://x.com/bcherny) - Verification philosophy

## License

MIT

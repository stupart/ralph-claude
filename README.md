# ralph-claude

A minimal Rust CLI for running Claude Code in autonomous loops until your PRD is complete.

Based on the [Ralph Wiggum Technique](https://github.com/ghuntley/how-to-ralph-wiggum) by Geoffrey Huntley, with additions from:
- [Anthropic's harness patterns](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Thariq's interview technique](https://x.com/trq212/status/2005315279455142243)
- [Boris Cherny's verification philosophy](https://x.com/bcherny)

## Philosophy

> "Ralph isn't just 'a loop that codes.' It's a funnel with 3 Phases, 2 Prompts, and 1 Loop."

The key insight: **fresh context per iteration**, with state persisted to files + git. Each loop starts clean, reads the current state, does one thing, commits, and exits.

## Install

```bash
cargo install --path .
```

Or build from source:
```bash
cargo build --release
cp target/release/ralph /usr/local/bin/
```

## Quick Start

```bash
ralph --init myproject
cd myproject
ralph --yolo
```

That's it. Ralph will:
1. Ask for an optional brain dump (context, ideas, links)
2. Interview you about what to build
3. Generate the PRD with features
4. Execute the build loop until complete

---

## Usage Scenarios

### 1. New Project with Brain Dump

You have ideas, links, notes - dump them all upfront:

```bash
ralph --init myproject
```

```
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
> I want a CLI tool like ripgrep but for JSON files
> should support jq-like queries but simpler syntax
> look at how miller (mlr) handles CSV - similar UX
> must be fast, written in Rust
>
>

  create docs/brain-dump.md

Done! Run:
  cd myproject && ralph --yolo
```

Then start the loop:
```bash
cd myproject
ralph --yolo
```

Claude reads your brain dump, deeply analyzes it, then interviews you with context-aware questions.

---

### 2. New Project, No Brain Dump

Just hit Enter to skip:

```bash
ralph --init myproject
```

```
Brain dump?
(Paste any context, ideas, links, references - press Enter twice when done, or just Enter to skip)
>

  skip brain dump

Done! Run:
  cd myproject && ralph --yolo
```

```bash
cd myproject
ralph --yolo
```

Interview starts from scratch.

---

### 3. Existing Project, Adding Ralph

You have code but want Ralph to help extend it:

```bash
cd my-existing-app
ralph --init
```

```
Initializing ralph project...
  skip .git (already exists)
  create CLAUDE.md
  create PRD.json
  ...

Brain dump?
> The auth system is fragile, don't refactor it
> Need to add a notification system
> Use the pattern from /services/email.ts
> Product wants real-time but no websockets yet
>
>

  create docs/brain-dump.md
```

```bash
ralph --yolo
```

Claude analyzes your existing codebase + brain dump, then interviews you about what to add/change.

---

### 4. Existing Ralph Project, Adding Brain Dump Later

Already initialized but want to add context before re-running interview:

```bash
cd my-ralph-project

# Create brain dump manually
mkdir -p docs
cat > docs/brain-dump.md << 'EOF'
# Brain Dump

Actually, I realized we need offline support.
Check out how Notion does local-first sync.
Also the error messages are confusing - make them friendlier.
EOF

# Re-run interview (it will read the brain dump)
claude /interview
```

Or just delete PRD.json features to trigger a fresh interview:
```bash
echo '{"project": "My Project", "features": []}' > PRD.json
ralph --yolo
```

---

### 5. Existing Ralph Project, No Changes

Just continue where you left off:

```bash
cd my-ralph-project
ralph --yolo
```

If PRD has features, Ralph continues the build loop. If PRD is empty, it runs the interview first.

---

## Full Command Reference

```
ralph [OPTIONS] [PROJECT_NAME]

Arguments:
  [PROJECT_NAME]         Project name (creates folder if used with --init)

Options:
  -p, --prompt <PROMPT>  Path to prompt file [default: .claude/commands/ralph.md]
      --prd <PRD>        Path to PRD file [default: PRD.json]
  -m, --max-iterations   Maximum iterations, 0 = unlimited [default: 0]
  -d, --delay <SECONDS>  Delay between iterations [default: 2]
      --init             Initialize project with templates
      --dry-run          Don't execute claude, just show what would run
      --yolo             Skip all permission prompts (autonomous mode)
  -h, --help             Print help
```

---

## Workflow

### Phase 1: Interview
```bash
ralph --yolo  # (runs interview automatically if PRD is empty)
# or explicitly:
claude /interview
```
Claude reads any brain dump, analyzes the codebase (if existing), then asks 20-50 detailed questions. Outputs structured PRD.json.

### Phase 2: Plan
```bash
claude /plan
```
Claude analyzes the codebase, identifies gaps, and creates a prioritized implementation plan in `plan.md`.

### Phase 3: Build (Loop)
```bash
ralph --yolo
```
Runs Claude in a loop. Each iteration:
1. Reads state files (PRD, progress, plan)
2. Executes next task
3. Verifies (tests, typecheck, lint, manual)
4. Commits with descriptive message
5. Updates progress.md and PRD.json
6. Exits cleanly

Loop continues until all features in PRD.json have status "passing".

---

## Brain Dump Tips

Good brain dumps include:
- **What you're building** (even if vague)
- **Inspiration/references** ("like X but simpler")
- **Technical constraints** ("must work offline", "no external deps")
- **Links** to docs, designs, similar projects
- **Anti-patterns** ("don't use Redux", "avoid class components")
- **Context** about existing code ("auth is fragile, don't touch")

Claude will analyze all of this before asking questions, so your interview is more focused and productive.

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
# Start your dev server first
npm run dev

# Then in Claude Code
/chrome http://localhost:3000
```

Claude will open a browser and can click through UI flows, fill forms, verify rendering, test edge cases.

---

## Permissions

### Option 1: Use `--yolo` (simple, wide open)
```bash
ralph --yolo
```
Passes `--dangerously-skip-permissions` to Claude. Fast but approves everything.

### Option 2: Use `.claude/settings.json` (recommended)
`ralph --init` creates sensible defaults:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Read",
      "Write",
      "Edit"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force*)"
    ]
  }
}
```

With settings.json, just run `ralph` (no --yolo) and it auto-approves safe commands.

---

## Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project guidelines, verification rules |
| `PRD.json` | Feature list with status tracking |
| `progress.md` | Append-only log of completed work |
| `guardrails.md` | Hard rules (never commit failing tests, etc.) |
| `plan.md` | Current implementation plan (generated) |
| `docs/brain-dump.md` | Initial context dump (optional) |
| `.claude/settings.json` | Permission rules for autonomous mode |
| `.claude/commands/*.md` | Claude Code slash commands |

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

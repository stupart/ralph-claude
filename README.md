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

1. Initialize a project:
```bash
cd your-project
ralph --init
```

This creates:
- `CLAUDE.md` - project guidelines & verification rules
- `PRD.json` - feature list with status tracking
- `progress.md` - append-only session log
- `guardrails.md` - hard rules that must never be violated
- `.claude/commands/` - interview, plan, build, and ralph prompts

2. Edit `PRD.json` with your features

3. Run the interview to refine requirements:
```bash
claude /interview
```

4. Start the Ralph loop:
```bash
ralph
```

## Usage

```
ralph [OPTIONS]

Options:
  -p, --prompt <PROMPT>      Path to prompt file [default: .claude/commands/ralph.md]
      --prd <PRD>            Path to PRD file [default: PRD.json]
  -m, --max-iterations <N>   Maximum iterations, 0 = unlimited [default: 0]
  -d, --delay <SECONDS>      Delay between iterations [default: 2]
      --init                 Initialize project with templates
      --dry-run              Don't execute claude, just show what would run
  -h, --help                 Print help
```

## Workflow

### Phase 1: Interview
```bash
claude /interview
```
Claude asks 20-50 detailed questions about your requirements, then generates comprehensive specs and updates PRD.json.

### Phase 2: Plan
```bash
claude /plan
```
Claude analyzes the codebase, identifies gaps, and creates a prioritized implementation plan in `plan.md`.

### Phase 3: Build (Loop)
```bash
ralph
```
Runs Claude in a loop. Each iteration:
1. Reads state files (PRD, progress, plan)
2. Executes next task
3. Verifies (tests, typecheck, lint, manual)
4. Commits with descriptive message
5. Updates progress.md and PRD.json
6. Exits cleanly

Loop continues until all features in PRD.json have status "passing".

## PRD Structure

```json
{
  "project": "My Project",
  "features": [
    {
      "id": "F001",
      "title": "User Authentication",
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

## Verification (Critical)

From Boris Cherny: "Give Claude a way to verify its work - this 2-3x the quality."

Every feature must be verified before marking complete:
- **Web apps**: Use dev-browser or Chrome extension to test UI
- **APIs**: Run actual requests, test error cases
- **All code**: Tests pass, typecheck passes, lint passes

## Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project guidelines, verification rules |
| `PRD.json` | Feature list with status tracking |
| `progress.md` | Append-only log of completed work |
| `guardrails.md` | Hard rules (never commit failing tests, etc.) |
| `plan.md` | Current implementation plan (generated) |
| `.claude/commands/*.md` | Claude Code slash commands |

## Tips

- **Start small**: Begin with 1-2 features, add more as they complete
- **Be specific**: Vague acceptance criteria = vague implementation
- **Trust the loop**: Each iteration is fresh - if one fails, the next can try differently
- **Check progress.md**: See what's been done across sessions
- **Use `--max-iterations`**: Limit runs while testing your setup

## Credits

- [Geoffrey Huntley](https://github.com/ghuntley) - Original Ralph Wiggum Technique
- [Anthropic](https://anthropic.com) - Claude Code and harness patterns
- [Thariq](https://x.com/trq212) - Interview prompt technique
- [Boris Cherny](https://x.com/bcherny) - Verification philosophy

## License

MIT

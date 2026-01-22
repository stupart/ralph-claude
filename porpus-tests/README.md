# Porpus Persona Test System

Autonomous testing framework for Porpus using Claude Code subagents.

## Structure

```
porpus-tests/
├── personas/           # Persona definitions
│   └── eager-optimist.md
├── sessions/           # Test session outputs
│   └── {persona}_{timestamp}/
│       ├── persona.md      # Copy of persona used
│       ├── conversation.log # Terminal output
│       ├── debug.log       # API call details
│       └── test.db         # SQLite database
├── run-test.sh         # Test runner script
└── README.md
```

## Usage

### Manual Testing (Interactive)

```bash
cd porpus-tests
./run-test.sh eager-optimist
# Then interact with Porpus yourself
```

### Autonomous Testing (via Claude Code)

From Claude Code, spawn a subagent that acts as the persona:

```
Run a persona-based test of Porpus:

1. Read the persona file at ../porpus-tests/personas/eager-optimist.md
2. Start Porpus with: cd ../Porpus && PORPUS_DB=../porpus-tests/sessions/eager-optimist_$(date +%Y%m%d_%H%M%S)/test.db DEBUG=1 npm run dev
3. Respond AS the eager-optimist persona for 10-15 exchanges
4. Complete the Future Vision stage if possible
5. Report observations on how Porpus handled this persona type
```

### Viewing Results

After a test:
```bash
# See conversation
cat sessions/eager-optimist_*/conversation.log

# See API calls (system prompts, tool use, etc.)
cat sessions/eager-optimist_*/debug.log

# Check database
sqlite3 sessions/eager-optimist_*/test.db "SELECT * FROM conversations;"
```

## Creating New Personas

Create a markdown file in `personas/` with:

1. **Personality Traits** - Core characteristics
2. **Conversation Style** - How they communicate
3. **Sample Responses** - Examples for key moments
4. **Test Goals** - What we're testing for
5. **Red Flags** - What would indicate a problem

See `personas/eager-optimist.md` for an example.

## Persona Ideas

| Persona | Tests |
|---------|-------|
| eager-optimist | Agreeable users, does AI still probe? |
| skeptical-pragmatist | Pushback, rapport maintenance |
| vague-dreamer | Unclear wants, clarity extraction |
| stressed-achiever | Impatient users, pacing |
| cold-minimalist | One-word answers, drawing out |
| contradictory-thinker | Inconsistent values, detection |

## Key Principle

**Tests do NOT modify Porpus code.** They use the existing `PORPUS_DB` environment variable to isolate each test session.

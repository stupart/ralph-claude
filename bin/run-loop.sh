#!/bin/bash
# Continuous self-improvement loop for Layer Cake
# Runs indefinitely, creating new branches for each generation
# Usage: ./bin/run-loop.sh [starting_gen_number]

set -e

RALPH_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RALPH_ROOT"

GEN=${1:-4}  # Start from gen4 by default
MAX_TURNS=50
TIMEOUT_MS=600000

echo "=== Layer Cake Self-Improvement Loop ==="
echo "Starting from generation $GEN"
echo "Working directory: $RALPH_ROOT"
echo "Press Ctrl+C to stop gracefully"
echo ""

while true; do
    BRANCH="layer-cake-gen${GEN}"
    echo "[$(date '+%H:%M:%S')] === Generation $GEN starting ==="

    # Create or switch to generation branch
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH" 2>/dev/null || {
        echo "Error creating branch $BRANCH, skipping"
        GEN=$((GEN + 1))
        continue
    }

    # Ensure input directory exists
    INPUT_DIR="_self-improve/gen${GEN}/1-input"
    mkdir -p "$INPUT_DIR"

    # Generate brain dump from current state if not exists
    if [ ! -f "$INPUT_DIR/brain-dump.md" ]; then
        echo "[$(date '+%H:%M:%S')] Generating brain dump for gen${GEN}..."
        cat > "$INPUT_DIR/brain-dump.md" << BRAINDUMP
# Self-Improvement Brain Dump - Generation $GEN
**Date:** $(date -u '+%Y-%m-%dT%H:%M:%SZ')
**Generation:** $GEN

## Input Sources
$(cat BUGS.md 2>/dev/null || echo "No BUGS.md")

---

$(cat IDEAS.md 2>/dev/null || echo "No IDEAS.md")

---

## Test Results
\`\`\`
$(npx jest --config jest.config.js --forceExit 2>&1 | tail -20 || echo "Tests could not run")
\`\`\`

## Focus
Improve prompts, fix bugs, add tests, reduce complexity.
Target: templates/agents/*.md, lib/*.js, tests/*.test.js
BRAINDUMP
    fi

    # Run Claude as the improvement agent
    echo "[$(date '+%H:%M:%S')] Running Claude improvement agent..."
    claude -p "You are the Layer Cake self-improvement agent, generation $GEN.

Read _self-improve/gen${GEN}/1-input/brain-dump.md for context.

Your job: make 3-5 meaningful improvements to the Layer Cake system.
Focus on: prompt quality, bug fixes, test coverage, code quality.

Target files: templates/agents/*.md, lib/*.js, tests/*.test.js

Rules:
1. Read files before editing
2. Run tests after changes (npx jest --config jest.config.js --forceExit)
3. Commit each change: [gen${GEN}] type: description
4. Push when done: git push -u origin $BRANCH
5. Update BUGS.md and IDEAS.md to track progress

Make real, substantive improvements. Quality over quantity." \
        --max-turns "$MAX_TURNS" \
        --allowedTools "Read,Write,Edit,Bash,Glob,Grep" \
        2>&1 | tee "_self-improve/gen${GEN}/output.log" || true

    # Commit any uncommitted changes
    git add -A
    git commit -m "[gen${GEN}] auto: end of generation $GEN" --allow-empty 2>/dev/null || true
    git push -u origin "$BRANCH" 2>/dev/null || true

    echo "[$(date '+%H:%M:%S')] === Generation $GEN complete ==="
    echo ""

    # Next generation
    GEN=$((GEN + 1))

    # Brief pause between generations
    sleep 10
done

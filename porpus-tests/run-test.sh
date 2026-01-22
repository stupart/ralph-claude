#!/bin/bash

# Porpus Persona Test Runner
# Usage: ./run-test.sh <persona-name>
# Example: ./run-test.sh eager-optimist

set -e

PERSONA=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORPUS_DIR="$SCRIPT_DIR/../Porpus"
SESSION_DIR="$SCRIPT_DIR/sessions/${PERSONA}_${TIMESTAMP}"

# Check arguments
if [ -z "$PERSONA" ]; then
    echo "Usage: ./run-test.sh <persona-name>"
    echo "Available personas:"
    ls -1 personas/*.md | sed 's/personas\//  /g' | sed 's/\.md//g'
    exit 1
fi

# Check persona exists
PERSONA_FILE="$SCRIPT_DIR/personas/${PERSONA}.md"
if [ ! -f "$PERSONA_FILE" ]; then
    echo "Error: Persona '$PERSONA' not found at $PERSONA_FILE"
    exit 1
fi

# Create session directory
mkdir -p "$SESSION_DIR"

echo "=========================================="
echo "Porpus Persona Test"
echo "=========================================="
echo "Persona: $PERSONA"
echo "Session: $SESSION_DIR"
echo "Timestamp: $TIMESTAMP"
echo "=========================================="
echo ""

# Copy persona file to session for reference
cp "$PERSONA_FILE" "$SESSION_DIR/persona.md"

# Set environment for Porpus
export PORPUS_DB="$SESSION_DIR/test.db"
export DEBUG=1

echo "Environment:"
echo "  PORPUS_DB=$PORPUS_DB"
echo "  DEBUG=1 (logs to $SESSION_DIR/debug.log)"
echo ""
echo "Starting Porpus..."
echo "=========================================="
echo ""

# Create symlink for debug log in session folder
cd "$PORPUS_DIR"

# Run Porpus and capture output
# The actual interaction is done by Claude Code subagent - this just sets up the session
# To run interactively for testing:
npm run dev 2>&1 | tee "$SESSION_DIR/conversation.log"

echo ""
echo "=========================================="
echo "Test session complete"
echo "Output saved to: $SESSION_DIR"
echo "  - conversation.log: Full terminal output"
echo "  - debug.log: API call details (check $PORPUS_DIR/data/debug.log)"
echo "  - test.db: SQLite database"
echo "=========================================="

# Copy debug log to session
if [ -f "$PORPUS_DIR/data/debug.log" ]; then
    cp "$PORPUS_DIR/data/debug.log" "$SESSION_DIR/debug.log"
fi

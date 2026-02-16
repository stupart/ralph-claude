#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$RALPH_ROOT/support/com.ralph-claude.evolve.plist"
TARGET="$HOME/Library/LaunchAgents/com.ralph-claude.evolve.plist"

# Verify source template exists
if [ ! -f "$SOURCE" ]; then
  echo "Error: plist template not found at $SOURCE" >&2
  exit 1
fi

# Copy plist with path substitution
mkdir -p "$HOME/Library/LaunchAgents"
sed "s|{{RALPH_ROOT}}|$RALPH_ROOT|g" "$SOURCE" > "$TARGET"

# Create logs directory
mkdir -p "$RALPH_ROOT/_evolution/logs"

# Load the agent
if ! launchctl load "$TARGET" 2>&1; then
  echo "Error: launchctl load failed" >&2
  exit 1
fi

# Print confirmation
echo "Installed: $TARGET"
echo "Project root: $RALPH_ROOT"
echo "Logs: $RALPH_ROOT/_evolution/logs/"
echo "Verify: launchctl list | grep ralph"

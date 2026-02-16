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

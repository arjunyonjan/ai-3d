#!/bin/bash
PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"
BIN="$DIR/target/release/jarvis-ecosystem"
if [ ! -f "$BIN" ]; then
  echo "Building first..."
  cargo build --release -q
fi
setsid "$BIN" "$PORT" > /dev/null 2>&1 &
sleep 0.5
if pgrep -f "$BIN" > /dev/null 2>&1; then
  echo "ecosystem-server running at http://localhost:$PORT"
else
  echo "FAILED to start"
fi

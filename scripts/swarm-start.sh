#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"
BUILD_LOG="$LOG_DIR/client-build.log"
SERVER_LOG="$LOG_DIR/server.log"
CLIENT_LOG="$LOG_DIR/client.log"

mkdir -p "$RUN_DIR" "$LOG_DIR"

if ss -tln | grep -q ':3000 '; then
  echo "Port 3000 is already in use. Run restart or stop first."
  exit 1
fi

if ss -tln | grep -q ':4000 '; then
  echo "Port 4000 is already in use. Run restart or stop first."
  exit 1
fi

echo "Building client..."
(
  cd "$ROOT_DIR/client"
  npm run build
) >"$BUILD_LOG" 2>&1

echo "Starting server..."
(
  cd "$ROOT_DIR/server"
  nohup npm start >"$SERVER_LOG" 2>&1 &
  echo $! >"$RUN_DIR/server.pid"
)

echo "Starting client..."
(
  cd "$ROOT_DIR/client"
  nohup npm start -- -H 0.0.0.0 >"$CLIENT_LOG" 2>&1 &
  echo $! >"$RUN_DIR/client.pid"
)

echo "Swarm Gallery is starting."
echo "Client: http://localhost:3000"
echo "Server: http://localhost:4000"
echo "Logs:"
echo "- $SERVER_LOG"
echo "- $CLIENT_LOG"
echo "- $BUILD_LOG"

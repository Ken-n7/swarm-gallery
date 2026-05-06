#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"
BUILD_LOG="$LOG_DIR/client-build.log"
SERVER_LOG="$LOG_DIR/server.log"
CLIENT_LOG="$LOG_DIR/client.log"
ADMIN_URL="http://localhost:3000/admin"

mkdir -p "$RUN_DIR" "$LOG_DIR"

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"

  for ((i = 0; i < attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

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

if [[ "${SWARM_OPEN_ADMIN:-1}" != "0" ]] && command -v xdg-open >/dev/null 2>&1; then
  echo "Waiting for admin to become reachable..."
  if wait_for_url "$ADMIN_URL"; then
    nohup xdg-open "$ADMIN_URL" >/dev/null 2>&1 &
    echo "Opened admin in browser: $ADMIN_URL"
  else
    echo "Admin did not become reachable in time. Open it manually: $ADMIN_URL"
  fi
fi

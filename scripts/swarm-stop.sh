#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"

mkdir -p "$RUN_DIR"

wait_for_port_release() {
  local port="$1"
  local attempts="${2:-30}"

  for ((i = 0; i < attempts; i++)); do
    if ! ss -tln | grep -q ":${port} "; then
      return 0
    fi
    sleep 1
  done

  return 1
}

kill_pid_file() {
  local pid_file="$1"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"

    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi

    rm -f "$pid_file"
  fi
}

kill_pid_file "$RUN_DIR/server.pid"
kill_pid_file "$RUN_DIR/client.pid"

fuser -k 4000/tcp >/dev/null 2>&1 || true
fuser -k 3000/tcp >/dev/null 2>&1 || true

wait_for_port_release 4000 || {
  echo "Port 4000 did not release in time."
  exit 1
}

wait_for_port_release 3000 || {
  echo "Port 3000 did not release in time."
  exit 1
}

echo "Swarm Gallery services stopped."

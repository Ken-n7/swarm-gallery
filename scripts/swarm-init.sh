#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENV="$ROOT_DIR/server/.env"
CLIENT_ENV="$ROOT_DIR/client/.env.local"
MODE="${1:-local}"

detect_ip() {
  local ip

  ip="$(ip route get 8.8.8.8 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"

  if [[ -z "${ip:-}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi

  if [[ -z "${ip:-}" ]]; then
    echo "Could not detect a LAN IP automatically." >&2
    exit 1
  fi

  printf '%s\n' "$ip"
}

upsert_line() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [[ ! -f "$file" ]]; then
    printf '%s=%s\n' "$key" "$value" >"$file"
    return
  fi

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

ensure_server_defaults() {
  upsert_line "$SERVER_ENV" "PORT" "4000"
  upsert_line "$SERVER_ENV" "ADMIN_PASSWORD" "admin123"
  upsert_line "$SERVER_ENV" "COOKIE_SECRET" "change-this-secret-before-event"
}

ensure_client_file() {
  if [[ ! -f "$CLIENT_ENV" ]]; then
    : >"$CLIENT_ENV"
  fi
}

ensure_server_defaults
ensure_client_file

case "$MODE" in
  local)
    upsert_line "$SERVER_ENV" "CLIENT_URL" "http://localhost:3000"
    upsert_line "$CLIENT_ENV" "NEXT_PUBLIC_SERVER_URL" "http://localhost:4000"
    echo "Initialized Swarm Gallery for local laptop use."
    ;;
  network)
    CURRENT_IP="$(detect_ip)"
    upsert_line "$SERVER_ENV" "CLIENT_URL" "http://${CURRENT_IP}:3000"
    upsert_line "$CLIENT_ENV" "NEXT_PUBLIC_SERVER_URL" "http://${CURRENT_IP}:4000"
    echo "Initialized Swarm Gallery for network use."
    echo "Detected IP: $CURRENT_IP"
    ;;
  *)
    echo "Usage: bash scripts/swarm-init.sh [local|network]" >&2
    exit 1
    ;;
esac

echo "- server/.env ready"
echo "- client/.env.local ready"
echo
echo "Next step:"
echo "npm run swarm:start"

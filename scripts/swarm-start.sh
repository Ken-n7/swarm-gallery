#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"

mkdir -p "$RUN_DIR" "$LOG_DIR"

# ── Port check ────────────────────────────────────────────────────────
if ss -tln | grep -q ':3000 '; then
  echo "Port 3000 already in use. Run 'npm stop' first."
  exit 1
fi
if ss -tln | grep -q ':4000 '; then
  echo "Port 4000 already in use. Run 'npm stop' first."
  exit 1
fi

# ── Ensure server .env exists ─────────────────────────────────────────
SERVER_ENV="$ROOT_DIR/server/.env"
if [[ ! -f "$SERVER_ENV" ]]; then
  cat >"$SERVER_ENV" <<EOF
PORT=4000
ADMIN_PASSWORD=admin123
COOKIE_SECRET=change-this-secret-before-event
EOF
  echo "Created server/.env with defaults."
fi

# ── Ensure client .env.local exists (SSR fallback only) ───────────────
CLIENT_ENV="$ROOT_DIR/client/.env.local"
if [[ ! -f "$CLIENT_ENV" ]]; then
  echo "NEXT_PUBLIC_SERVER_URL=http://localhost:4000" >"$CLIENT_ENV"
fi

# ── First-run install ─────────────────────────────────────────────────
if [[ ! -d "$ROOT_DIR/server/node_modules" ]]; then
  echo "Installing server dependencies..."
  (cd "$ROOT_DIR/server" && npm install)
fi

if [[ ! -d "$ROOT_DIR/client/node_modules" ]]; then
  echo "Installing client dependencies..."
  (cd "$ROOT_DIR/client" && npm install)
fi

# ── Build client (always, so code changes are picked up on every start) ──
echo "Building client..."
(cd "$ROOT_DIR/client" && npm run build) >"$LOG_DIR/client-build.log" 2>&1 \
  && echo "Build complete." \
  || { echo "Build failed. Check $LOG_DIR/client-build.log"; exit 1; }

# ── Launch ────────────────────────────────────────────────────────────
echo "Starting server..."
(cd "$ROOT_DIR/server" && nohup npm start >"$LOG_DIR/server.log" 2>&1 & echo $! >"$RUN_DIR/server.pid")

echo "Starting client..."
(cd "$ROOT_DIR/client" && nohup npm start -- -H 0.0.0.0 >"$LOG_DIR/client.log" 2>&1 & echo $! >"$RUN_DIR/client.pid")

# ── Wait + open ───────────────────────────────────────────────────────
echo "Waiting for admin panel..."
for ((i = 0; i < 30; i++)); do
  curl -fsS http://localhost:3000/admin >/dev/null 2>&1 && break
  sleep 1
done

echo ""
echo "  Admin   → http://localhost:3000/admin"
echo "  Guests  → check the Network card in admin for the guest link"
echo "  Logs    → $LOG_DIR"
echo ""

command -v xdg-open >/dev/null 2>&1 && nohup xdg-open http://localhost:3000/admin >/dev/null 2>&1 &
true

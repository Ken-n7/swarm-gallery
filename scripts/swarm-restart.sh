#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/swarm-stop.sh"

echo "Rebuilding client..."
(cd "$ROOT_DIR/client" && npm run build) 2>&1 | tail -6

bash "$ROOT_DIR/scripts/swarm-start.sh"

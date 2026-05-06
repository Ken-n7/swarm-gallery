#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/swarm-stop.sh"

rm -f \
  "$ROOT_DIR/server/data/gallery.db" \
  "$ROOT_DIR/server/data/gallery.db-shm" \
  "$ROOT_DIR/server/data/gallery.db-wal"

rm -rf "$ROOT_DIR/server/storage/events/demo"
rm -rf "$ROOT_DIR/server/storage/avatars/demo"

echo "Swarm Gallery data reset complete."
echo "Run 'npm run swarm:start' to boot a fresh demo event."

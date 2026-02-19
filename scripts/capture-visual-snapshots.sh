#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUTPUT_DIR="output/playwright"
PORT="${SNAPSHOT_PORT:-3210}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
SERVER_CMD=(npm run start -- --port "$PORT" --hostname "$HOST")

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required for visual snapshots." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

"${SERVER_CMD[@]}" >/tmp/az-labs-snapshot-server.log 2>&1 &
SERVER_PID=$!

for _ in {1..60}; do
  if curl -fsS "$BASE_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "$BASE_URL" >/dev/null 2>&1; then
  echo "Failed to start app server for snapshots. See /tmp/az-labs-snapshot-server.log" >&2
  exit 1
fi

PLAYWRIGHT_BASE=(npx --yes playwright@1.51.0)
"${PLAYWRIGHT_BASE[@]}" install chromium >/tmp/az-labs-playwright-install.log 2>&1

PLAYWRIGHT_CMD=("${PLAYWRIGHT_BASE[@]}" screenshot --full-page)

"${PLAYWRIGHT_CMD[@]}" "$BASE_URL/" "$OUTPUT_DIR/landing-desktop.png"
"${PLAYWRIGHT_CMD[@]}" "$BASE_URL/?preview=chat-loading" "$OUTPUT_DIR/chat-loading-desktop.png"
"${PLAYWRIGHT_CMD[@]}" "$BASE_URL/?preview=chat-ready" "$OUTPUT_DIR/chat-ready-desktop.png"
"${PLAYWRIGHT_CMD[@]}" "$BASE_URL/?preview=chat-error" "$OUTPUT_DIR/chat-error-desktop.png"

"${PLAYWRIGHT_BASE[@]}" screenshot --viewport-size="390,844" "$BASE_URL/?preview=chat-ready" "$OUTPUT_DIR/chat-ready-mobile.png"

echo "Visual snapshots captured in $OUTPUT_DIR"

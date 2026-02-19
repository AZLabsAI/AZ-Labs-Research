#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify] Running repository verification checks"

if npm run | grep -qE '^\s*test\s'; then
  echo "[verify] Running npm test"
  npm run test
else
  echo "[verify] No npm test script found; skipping tests"
fi

if [[ -x "scripts/capture-visual-snapshots.sh" ]]; then
  echo "[verify] Capturing visual snapshots"
  npm run snapshots
fi

echo "[verify] Verification complete"

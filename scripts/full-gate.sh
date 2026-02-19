#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_FILE="output/verification/full-gate.log"
mkdir -p "$(dirname "$LOG_FILE")"

exec > >(tee "$LOG_FILE") 2>&1

echo "[gate] Starting full gate at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "[gate] Running npm install"
npm install

echo "[gate] Running lint"
npm run lint

echo "[gate] Running build"
npm run build

echo "[gate] Running verify"
npm run verify

echo "[gate] Full gate passed"

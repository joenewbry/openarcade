#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${NET_PID:-}" ]]; then
    kill "$NET_PID" 2>/dev/null || true
  fi
  if [[ -n "${VITE_PID:-}" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[demo] Starting networking server on ws://127.0.0.1:3001"
npm run net:server &
NET_PID=$!

# Give WS server a moment before client boot to reduce noisy connect retries.
sleep 0.4

echo "[demo] Starting Vite dev server on http://127.0.0.1:5173"
npm run dev -- --host 127.0.0.1 --port 5173 &
VITE_PID=$!

echo "[demo] Demo stack is running. Press Ctrl+C to stop both services."

wait

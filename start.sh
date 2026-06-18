#!/usr/bin/env bash
# Start the DashboardCraft backend (Go API on :8080) and frontend (Next.js on :3000)
# together. Ctrl+C stops both cleanly.
#
# Usage:
#   ./start.sh            # backend uses .env (AI_PROVIDER, e.g. gemini)
#   ./start.sh --mock     # force the deterministic mock AI provider (no Gemini calls)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

MOCK_AI=""
if [[ "${1:-}" == "--mock" ]]; then
  MOCK_AI="1"
fi

pids=()

cleanup() {
  echo ""
  echo "› Shutting down…"
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  # Also free the ports in case child processes spawned their own.
  fuser -k 8080/tcp 2>/dev/null || true
  wait 2>/dev/null || true
  echo "› Stopped."
}
trap cleanup INT TERM EXIT

# Free port 8080 if a previous run is still holding it.
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

echo "› Starting backend (Go API → http://localhost:8080)…"
(
  cd "$BACKEND_DIR"
  if [[ -n "$MOCK_AI" ]]; then
    AI_PROVIDER=mock GEMINI_API_KEY= exec go run ./cmd/api/main.go
  else
    exec go run ./cmd/api/main.go
  fi
) &
pids+=("$!")

echo "› Starting frontend (Next.js → http://localhost:3000)…"
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
pids+=("$!")

echo "› Both running. Press Ctrl+C to stop."
echo "   Backend : http://localhost:8080/healthz"
echo "   Frontend: http://localhost:3000"
echo "   Admin   : http://localhost:3000/admin  (admin@example.com / admin12345)"

# Exit (and trigger cleanup) as soon as either process dies.
wait -n

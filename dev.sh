#!/usr/bin/env bash
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${GREEN}▸${RESET} $1"; }
dim()  { echo -e "${DIM}  $1${RESET}"; }
err()  { echo -e "${RED}✖${RESET} $1" >&2; }

# ── Derived state ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"

NEXT_PID=""
cleanup() {
  echo ""
  log "Shutting down…"

  # 1 – Next.js
  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    dim "stopping next dev (pid $NEXT_PID)"
    kill "$NEXT_PID" 2>/dev/null && wait "$NEXT_PID" 2>/dev/null || true
  fi

  # 2 – Supabase
  if supabase status >/dev/null 2>&1; then
    dim "stopping supabase…"
    supabase stop >/dev/null 2>&1 || true
  fi

  # 3 – Colima
  if colima status >/dev/null 2>&1; then
    dim "stopping colima…"
    colima stop >/dev/null 2>&1 || true
  fi

  log "All services stopped. Bye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Preflight checks ──────────────────────────────────────────
for cmd in colima docker supabase node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    err "Missing dependency: ${BOLD}$cmd${RESET}"
    err "Run: brew install ${cmd}"
    exit 1
  fi
done

if [[ ! -f "$SCRIPT_DIR/.env.development.local" ]]; then
  err "Missing .env.development.local — copy from .env.local.example and fill in local Supabase keys."
  exit 1
fi

# ── 1. Colima ─────────────────────────────────────────────────
if colima status >/dev/null 2>&1; then
  log "Colima already running"
else
  log "Starting Colima…"
  colima start --cpu 2 --memory 4 --disk 20 >/dev/null 2>&1
  log "Colima ready"
fi

# ── 2. Supabase ───────────────────────────────────────────────
if supabase status >/dev/null 2>&1; then
  log "Supabase already running"
else
  log "Starting Supabase…"
  supabase start -x analytics,vector,imgproxy 2>&1 | grep -E "^(Started|Creating|Applying)" || true
  log "Supabase ready"
fi

# Print local URLs
echo ""
echo -e "${BOLD}  Local dev URLs${RESET}"
dim "App          → http://localhost:3000"
dim "Studio       → http://127.0.0.1:54323"
dim "Mailpit      → http://127.0.0.1:54324"
dim "Supabase API → http://127.0.0.1:54321"
echo ""

# ── 3. Next.js ────────────────────────────────────────────────
log "Starting Next.js dev server…"
cd "$SCRIPT_DIR"
npm run dev &
NEXT_PID=$!

log "All services running. Press ${BOLD}Ctrl+C${RESET} to stop everything."
wait "$NEXT_PID"

#!/usr/bin/env bash
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${GREEN}▸${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $1"; }
dim()  { echo -e "${DIM}  $1${RESET}"; }
err()  { echo -e "${RED}✖${RESET} $1" >&2; }
hdr()  { echo -e "\n${BOLD}$1${RESET}"; }

# ── Flags ──────────────────────────────────────────────────────
RUNTIME=""   # colima | podman
RESET_DB=false
SYNC_ENV=false

for arg in "$@"; do
  case "$arg" in
    --colima)   RUNTIME="colima" ;;
    --podman)   RUNTIME="podman" ;;
    --reset)    RESET_DB=true ;;
    --sync-env) SYNC_ENV=true ;;
    --help|-h)
      echo "Usage: $0 --colima|--podman [--reset] [--sync-env]"
      echo ""
      echo "  --colima    Use Colima as the container runtime (macOS)"
      echo "  --podman    Use Podman as the container runtime"
      echo "  --reset     Full DB reset: re-applies all migrations + uploads seed images"
      echo "  --sync-env  Overwrite .env.development.local with live keys from supabase status"
      exit 0
      ;;
    *) err "Unknown flag: $arg"; exit 1 ;;
  esac
done

if [[ -z "$RUNTIME" ]]; then
  err "Specify a runtime: ${BOLD}--colima${RESET} or ${BOLD}--podman${RESET}"
  err "  npm run dev:mac     (colima)"
  err "  npm run dev:podman  (podman)"
  exit 1
fi

# ── Paths ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.development.local"
SUPABASE_DIR="$SCRIPT_DIR/supabase"
SUPA="$SCRIPT_DIR/node_modules/.bin/supabase"

# ── Cleanup ────────────────────────────────────────────────────
NEXT_PID=""
cleanup() {
  echo ""
  log "Shutting down…"

  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    dim "stopping next dev (pid $NEXT_PID)"
    kill "$NEXT_PID" 2>/dev/null && wait "$NEXT_PID" 2>/dev/null || true
  fi

  if $SUPA status >/dev/null 2>&1; then
    dim "stopping supabase…"
    $SUPA stop >/dev/null 2>&1 || true
  fi

  if [[ "$RUNTIME" == "colima" ]] && colima status >/dev/null 2>&1; then
    dim "stopping colima…"
    colima stop >/dev/null 2>&1 || true
  fi

  log "All services stopped. Bye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Preflight ─────────────────────────────────────────────────
hdr "Preflight"
for cmd in node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    err "Missing: ${BOLD}$cmd${RESET} — run: brew install $cmd"
    exit 1
  fi
done

# Install npm deps if missing or stale
if [[ ! -d "$SCRIPT_DIR/node_modules" ]] || \
   [[ "$SCRIPT_DIR/package.json" -nt "$SCRIPT_DIR/node_modules/.package-lock.json" ]]; then
  log "Installing npm dependencies…"
  npm install --prefix "$SCRIPT_DIR" --silent
fi
if [[ ! -x "$SUPA" ]]; then
  err "supabase CLI not found at $SUPA — try running npm install"
  exit 1
fi
log "Dependencies OK"

# ── 1. Container runtime ──────────────────────────────────────
hdr "Runtime ($RUNTIME)"

if [[ "$RUNTIME" == "colima" ]]; then
  if ! command -v colima &>/dev/null; then
    err "colima not found — run: brew install colima"
    exit 1
  fi
  export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
  if colima status >/dev/null 2>&1; then
    log "Colima already running"
  else
    log "Starting Colima…"
    colima start --cpu 2 --memory 4 --disk 20 2>&1 | tail -1 || true
    log "Ready"
  fi

elif [[ "$RUNTIME" == "podman" ]]; then
  # dev:podman assumes Linux — no machine needed, socket via systemd
  if ! command -v podman &>/dev/null; then
    err "podman not found — sudo apt install podman  # or dnf/pacman"
    exit 1
  fi
  PODMAN_SOCK="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
  export DOCKER_HOST="unix://$PODMAN_SOCK"

  if [[ ! -S "$PODMAN_SOCK" ]]; then
    log "Activating podman socket…"
    systemctl --user start podman.socket
  fi

  if ! podman info >/dev/null 2>&1; then
    err "Podman not reachable (DOCKER_HOST=$DOCKER_HOST)"
    err "  systemctl --user enable --now podman.socket"
    exit 1
  fi
  log "Podman OK"
fi

# ── 2. Supabase ───────────────────────────────────────────────
hdr "Supabase"
if $SUPA status >/dev/null 2>&1; then
  log "Already running"
else
  log "Starting… (this takes ~30s on first run)"
  $SUPA start -x analytics,vector,imgproxy 2>&1 \
    | grep -E "^(Started|Creating|Applying|Error)" || true
  log "Ready"
fi

# Parse keys from supabase status
SUPA_STATUS="$($SUPA status 2>/dev/null || true)"
if [[ -z "$SUPA_STATUS" ]]; then
  err "supabase status returned nothing — did it start correctly?"
  err "Check: $SUPA logs"
  exit 1
fi
ANON_KEY="$(echo "$SUPA_STATUS"     | awk '/anon key/{print $NF}')"
SERVICE_KEY="$(echo "$SUPA_STATUS"  | awk '/service_role key/{print $NF}')"
SUPA_URL="$(echo "$SUPA_STATUS"     | awk '/API URL/{print $NF}')"
DB_URL="$(echo "$SUPA_STATUS"       | awk '/DB URL/{print $NF}')"
STUDIO_URL="$(echo "$SUPA_STATUS"   | awk '/Studio URL/{print $NF}')"
INBUCKET_URL="$(echo "$SUPA_STATUS" | awk '/Inbucket URL|Mailpit URL/{print $NF}')"

# ── 3. Env file ───────────────────────────────────────────────
hdr "Environment"
write_env() {
  cat > "$ENV_FILE" <<EOF
# Auto-generated by dev.sh — do not commit
NEXT_PUBLIC_SUPABASE_URL=${SUPA_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
DATABASE_URL=${DB_URL}
EOF
  log "Wrote $ENV_FILE"
}

if [[ "$SYNC_ENV" == true ]]; then
  write_env
elif [[ ! -f "$ENV_FILE" ]]; then
  warn ".env.development.local not found — creating from supabase status"
  write_env
else
  FILE_KEY="$(grep NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY "$ENV_FILE" 2>/dev/null \
    | cut -d= -f2 || true)"
  if [[ -n "$ANON_KEY" && "$FILE_KEY" != "$ANON_KEY" ]]; then
    warn "Anon key mismatch — run ${BOLD}npm run dev:${RUNTIME} -- --sync-env${RESET} to fix"
  else
    log "$ENV_FILE OK"
  fi
fi

# ── 4. Database ───────────────────────────────────────────────
hdr "Database"
if [[ "$RESET_DB" == true ]]; then
  log "Full reset: re-applying all migrations…"
  $SUPA db reset 2>&1 | grep -E "^(Applying|Seeding|Error|WARNING)" || true
  log "Migrations applied"
  if ls "$SUPABASE_DIR/seed_images"/*.png >/dev/null 2>&1; then
    log "Uploading seed images…"
    "$SUPABASE_DIR/seed_images.sh" || warn "Seed image upload failed — continuing anyway"
  fi
else
  log "Applying pending migrations…"
  $SUPA migration up 2>&1 | grep -E "^(Applying|No pending|Error)" || true
  log "Schema up to date"
fi

# ── 5. URLs ───────────────────────────────────────────────────
hdr "Services"
dim "App          → http://localhost:3000"
[[ -n "$STUDIO_URL"   ]] && dim "Studio       → $STUDIO_URL"
[[ -n "$INBUCKET_URL" ]] && dim "Mailpit      → $INBUCKET_URL"
[[ -n "$SUPA_URL"     ]] && dim "Supabase API → $SUPA_URL"
[[ -n "$DB_URL"       ]] && dim "Postgres     → $DB_URL"
echo ""

# ── 6. Next.js ────────────────────────────────────────────────
log "Starting Next.js…"
cd "$SCRIPT_DIR"
npm run dev &
NEXT_PID=$!

echo ""
log "All services running. Press ${BOLD}Ctrl+C${RESET} to stop everything."
echo ""
wait "$NEXT_PID"

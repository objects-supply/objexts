#!/bin/bash
# Seed the offered_objects table with product catalog data

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

# Load env
if [ -f "$ROOT_DIR/.env.development.local" ]; then
    export $(grep -v '^#' "$ROOT_DIR/.env.development.local" | xargs)
elif [ -f "$ROOT_DIR/.env.local" ]; then
    export $(grep -v '^#' "$ROOT_DIR/.env.local" | xargs)
else
    echo "Error: No .env file found in $ROOT_DIR"
    exit 1
fi

# Run migration
echo "Adding image_url column if missing..."
psql "$DATABASE_URL" -c "ALTER TABLE offered_objects ADD COLUMN IF NOT EXISTS image_url TEXT;" 2>/dev/null || true

# Seed products
echo "Seeding products (limit: ${1:-50})..."
cd "$SCRIPT_DIR"
npm run scrape -- \
    --file data/all.txt \
    --limit "${1:-50}"

echo "Done!"

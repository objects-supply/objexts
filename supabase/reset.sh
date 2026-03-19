#!/bin/bash
# Full reset: migrations + seed data + seed images
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Resetting database..."
npx supabase db reset --local
echo "Uploading seed images..."
"$SCRIPT_DIR/seed_images.sh"
echo "Reset complete!"

#!/bin/bash
# Upload seed images to local Supabase storage
SUPABASE_URL="http://127.0.0.1:54321"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
BUCKET="product_images"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/seed_images"

for img in "$IMAGES_DIR"/*.png; do
  filename=$(basename "$img")
  echo "Uploading $filename..."
  curl -s -X POST "$SUPABASE_URL/storage/v1/object/$BUCKET/$filename" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: image/png" \
    --data-binary "@$img" > /dev/null
done
echo "Done uploading seed images."

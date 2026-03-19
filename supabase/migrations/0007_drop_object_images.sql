-- Remove cover_image_id FK from inventory first
ALTER TABLE inventory DROP COLUMN IF EXISTS cover_image_id;

-- Drop object_images table (not needed - products use image_url column)
DROP TABLE IF EXISTS object_images;

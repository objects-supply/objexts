-- Drop redundant brand_name column (now using brand_id FK)
DROP INDEX IF EXISTS idx_offered_objects_brand_name;
ALTER TABLE products DROP COLUMN IF EXISTS brand_name;

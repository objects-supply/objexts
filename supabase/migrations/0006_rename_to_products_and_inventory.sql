-- Migration: Rename tables and restructure
-- offered_objects → products (curated catalog)
-- objects → inventory (user's collection)
-- new: user_products (user-submitted, pending review)

-- ============================================================
-- STEP 1: Make brands global
-- ============================================================

DROP INDEX IF EXISTS brands_user_slug_idx;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_slug_unique') THEN
        ALTER TABLE brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
    END IF;
END $$;
ALTER TABLE brands ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- STEP 2: Rename offered_objects → products
-- ============================================================

ALTER TABLE offered_objects RENAME TO products;

-- Add brand_id FK
ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create brands from existing brand_name values
INSERT INTO brands (name, slug)
SELECT DISTINCT
    brand_name,
    LOWER(REGEXP_REPLACE(brand_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM products
WHERE brand_name IS NOT NULL
  AND brand_name != ''
ON CONFLICT (slug) DO NOTHING;

-- Link products to brands
UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE LOWER(REGEXP_REPLACE(p.brand_name, '[^a-zA-Z0-9]+', '-', 'g')) = b.slug
  AND p.brand_name IS NOT NULL;

-- ============================================================
-- STEP 3: Create user_products table
-- ============================================================

CREATE TABLE user_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand_name TEXT,
    product_url TEXT,
    image_url TEXT,
    category TEXT,
    description TEXT,
    default_price NUMERIC(10, 2),
    custom_fields JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: Rename objects → inventory
-- ============================================================

ALTER TABLE objects RENAME TO inventory;
ALTER TABLE inventory RENAME COLUMN product_url TO source_url;

-- Add FKs to products and user_products
ALTER TABLE inventory ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN user_product_id UUID REFERENCES user_products(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 5: Update object_images FK
-- ============================================================

ALTER TABLE object_images RENAME COLUMN object_id TO inventory_id;

-- ============================================================
-- STEP 6: Create indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_status ON user_products(status);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_product_id ON inventory(user_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_brand_id ON inventory(brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);

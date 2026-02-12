-- Offered objects catalog for autofill on Add Object form
CREATE TABLE IF NOT EXISTS offered_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_name TEXT,
  product_url TEXT,
  category TEXT,
  description TEXT,
  default_price NUMERIC(10, 2),
  custom_fields JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offered_objects_name ON offered_objects(name);
CREATE INDEX IF NOT EXISTS idx_offered_objects_brand_name ON offered_objects(brand_name);
CREATE INDEX IF NOT EXISTS idx_offered_objects_is_active ON offered_objects(is_active);

ALTER TABLE offered_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offered objects are viewable by everyone"
  ON offered_objects FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can insert own brands" ON brands;
DROP POLICY IF EXISTS "Users can update own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete own brands" ON brands;
ALTER TABLE brands DROP COLUMN IF EXISTS user_id;

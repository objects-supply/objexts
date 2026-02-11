-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT,
  UNIQUE(user_id, slug)
);

-- Objects table
CREATE TABLE IF NOT EXISTS objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  brand_name TEXT,
  brand_slug TEXT,
  product_url TEXT,
  description TEXT,
  acquisition_type TEXT NOT NULL DEFAULT 'Purchased',
  reason TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  category TEXT,
  custom_fields JSONB,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Object images table
CREATE TABLE IF NOT EXISTS object_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_objects_user_id ON objects(user_id);
CREATE INDEX IF NOT EXISTS idx_objects_acquired_at ON objects(acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);
CREATE INDEX IF NOT EXISTS idx_object_images_object_id ON object_images(object_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_images ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Brands: public read, owner write
CREATE POLICY "Brands are viewable by everyone"
  ON brands FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own brands"
  ON brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON brands FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands"
  ON brands FOR DELETE
  USING (auth.uid() = user_id);

-- Objects: public objects readable, owner full access
CREATE POLICY "Public objects are viewable by everyone"
  ON objects FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own objects"
  ON objects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objects"
  ON objects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own objects"
  ON objects FOR DELETE
  USING (auth.uid() = user_id);

-- Object images: follow parent object visibility
CREATE POLICY "Object images follow object visibility"
  ON object_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM objects
      WHERE objects.id = object_images.object_id
      AND (objects.is_public = true OR objects.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert images for own objects"
  ON object_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objects
      WHERE objects.id = object_images.object_id
      AND objects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for own objects"
  ON object_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM objects
      WHERE objects.id = object_images.object_id
      AND objects.user_id = auth.uid()
    )
  );

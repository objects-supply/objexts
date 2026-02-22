-- Objexts - Initial Flattened Schema
-- Complete schema after all migrations

-- ─── Tables ──────────────────────────────────────────────────────

CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    display_name text,
    bio text,
    avatar_url text,
    role text NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    url text,
    image_url text
);

CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
    name text NOT NULL,
    product_url text,
    image_url text,
    color text,
    category text,
    description text,
    default_price numeric(10, 2),
    custom_fields jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
    name text NOT NULL,
    brand_name text,
    product_url text,
    image_url text,
    category text,
    description text,
    default_price numeric(10, 2),
    custom_fields jsonb,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    user_product_id uuid REFERENCES user_products(id) ON DELETE SET NULL,
    brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
    name text NOT NULL,
    source_url text,
    image_url text,
    description text,
    acquisition_type text NOT NULL DEFAULT 'Purchased',
    reason text,
    quantity integer DEFAULT 1,
    price numeric(10, 2),
    currency text DEFAULT 'USD',
    category text,
    custom_fields jsonb,
    is_public boolean NOT NULL DEFAULT true,
    acquired_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────

CREATE UNIQUE INDEX brands_slug_unique_idx ON brands(slug);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_user_products_user_id ON user_products(user_id);
CREATE INDEX idx_user_products_status ON user_products(status);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_user_product_id ON inventory(user_product_id);
CREATE INDEX idx_inventory_brand_id ON inventory(brand_id);

-- ─── Functions & Triggers ────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ──────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Users: public read, owner update (but not role)
CREATE POLICY "Profiles are viewable by everyone"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT role FROM users WHERE id = auth.uid())
    );

-- Brands: public read, admin write
CREATE POLICY "Brands are viewable by everyone"
    ON brands FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert brands"
    ON brands FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update brands"
    ON brands FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete brands"
    ON brands FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Products: public read active products, admin write
CREATE POLICY "Active products are viewable by everyone"
    ON products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can insert products"
    ON products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update products"
    ON products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete products"
    ON products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User Products: owner full access, admin read all
CREATE POLICY "Users can view own user products"
    ON user_products FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user products"
    ON user_products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert own user products"
    ON user_products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user products"
    ON user_products FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user products"
    ON user_products FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can update user products"
    ON user_products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Inventory: public items viewable, owner full access
CREATE POLICY "Public inventory items are viewable by everyone"
    ON inventory FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
    ON inventory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
    ON inventory FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
    ON inventory FOR DELETE
    USING (auth.uid() = user_id);

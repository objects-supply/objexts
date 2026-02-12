-- Add role column to profiles
-- Supported values: 'user' (default), 'admin'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Index for querying by role (e.g. listing admins)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Prevent users from changing their own role via RLS.
-- Drop and recreate the update policy to exclude the role column.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Users can update their own profile, but NOT the role column.
-- The role column can only be changed via service_role or direct SQL.
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- Admin-only write access to offered_objects
CREATE POLICY "Admins can insert offered objects"
  ON offered_objects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update offered objects"
  ON offered_objects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete offered objects"
  ON offered_objects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

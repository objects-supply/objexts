ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS cover_image_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'objects_cover_image_id_fkey'
  ) THEN
    ALTER TABLE objects
      ADD CONSTRAINT objects_cover_image_id_fkey
      FOREIGN KEY (cover_image_id)
      REFERENCES object_images(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_objects_cover_image_id ON objects(cover_image_id);

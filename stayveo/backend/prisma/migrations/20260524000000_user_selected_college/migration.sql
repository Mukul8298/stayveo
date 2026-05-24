ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "college_id" UUID,
ADD COLUMN IF NOT EXISTS "college_name" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_college_id_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_college_id_fkey"
    FOREIGN KEY ("college_id") REFERENCES "colleges"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_college_id_idx" ON "users"("college_id");

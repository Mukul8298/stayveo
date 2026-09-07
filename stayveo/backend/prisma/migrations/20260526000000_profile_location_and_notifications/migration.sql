ALTER TABLE "student_profiles"
  ADD COLUMN IF NOT EXISTS "current_address" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "type" VARCHAR(40) NOT NULL DEFAULT 'service',
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "request_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "request_id" UUID;

ALTER TABLE "notifications"
  ALTER COLUMN "type" SET DEFAULT 'service',
  ALTER COLUMN "is_read" SET DEFAULT false,
  ALTER COLUMN "created_at" SET DEFAULT now();

CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx"
  ON "notifications" ("user_id", "is_read", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "notifications";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "bookings";
  END IF;
END $$;

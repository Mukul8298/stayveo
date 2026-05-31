ALTER TABLE "student_profiles"
  ADD COLUMN IF NOT EXISTS "current_address" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "laundry_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "provider_name" VARCHAR(200),
  "service_type" VARCHAR(40) NOT NULL,
  "service_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "student_address" TEXT,
  "student_latitude" DOUBLE PRECISION,
  "student_longitude" DOUBLE PRECISION,
  "provider_latitude" DOUBLE PRECISION,
  "provider_longitude" DOUBLE PRECISION,
  "distance_km" DOUBLE PRECISION,
  "pickup_date" DATE,
  "pickup_time" VARCHAR(80),
  "estimated_arrival" VARCHAR(120),
  "student_phone" VARCHAR(15),
  "student_name" VARCHAR(200),
  "student_image_url" TEXT,
  "decline_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "laundry_requests"
  ADD COLUMN IF NOT EXISTS "provider_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "service_type" VARCHAR(40) NOT NULL DEFAULT 'laundry',
  ADD COLUMN IF NOT EXISTS "student_address" TEXT,
  ADD COLUMN IF NOT EXISTS "student_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "student_longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "provider_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "provider_longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "distance_km" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickup_date" DATE,
  ADD COLUMN IF NOT EXISTS "pickup_time" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "estimated_arrival" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "student_phone" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "student_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "student_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "decline_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF to_regclass('public.service_requests') IS NOT NULL THEN
    INSERT INTO "laundry_requests" (
      "id",
      "student_id",
      "provider_id",
      "provider_name",
      "service_type",
      "service_id",
      "status",
      "student_address",
      "student_latitude",
      "student_longitude",
      "provider_latitude",
      "provider_longitude",
      "distance_km",
      "pickup_date",
      "pickup_time",
      "estimated_arrival",
      "student_phone",
      "student_name",
      "decline_reason",
      "created_at",
      "updated_at"
    )
    SELECT
      "id",
      "student_id",
      "provider_id",
      "provider_name",
      "service_type",
      "service_id",
      "status",
      "student_address",
      "student_latitude",
      "student_longitude",
      "provider_latitude",
      "provider_longitude",
      "distance_km",
      "selected_date",
      "selected_time",
      "estimated_arrival",
      "student_phone",
      "student_name",
      "decline_reason",
      "created_at",
      "updated_at"
    FROM "service_requests"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "laundry_requests_student_id_status_idx"
  ON "laundry_requests" ("student_id", "status");

CREATE INDEX IF NOT EXISTS "laundry_requests_provider_id_status_idx"
  ON "laundry_requests" ("provider_id", "status");

CREATE INDEX IF NOT EXISTS "laundry_requests_service_id_status_idx"
  ON "laundry_requests" ("service_id", "status");

DROP INDEX IF EXISTS "laundry_requests_student_id_service_type_service_id_status_key";

CREATE UNIQUE INDEX IF NOT EXISTS "laundry_requests_one_active_request_key"
  ON "laundry_requests" ("student_id", "service_type", "service_id")
  WHERE "status" IN ('pending', 'accepted');

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
      AND tablename = 'laundry_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "laundry_requests";
  END IF;

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

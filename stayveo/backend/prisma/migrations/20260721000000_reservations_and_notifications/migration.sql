-- Reservation pricing snapshots, room inventory extensions, and the
-- asynchronous notification outbox. Existing columns are intentionally kept.

ALTER TYPE "payment_type" ADD VALUE IF NOT EXISTS 'reservation';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE "pg_details"
  ADD COLUMN IF NOT EXISTS "security_deposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservation_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minimum_stay_months" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "number_of_beds" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "room_listings"
  ADD COLUMN IF NOT EXISTS "reservation_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minimum_stay_months" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "number_of_beds" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "platform_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "food_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "electricity_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "water_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maintenance_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "parking_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reserved_beds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "occupied_beds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "blocked_beds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "offline_beds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "reservation_id" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "monthly_rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "security_deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservation_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platform_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minimum_stay_months" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "number_of_beds" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "food_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "electricity_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "water_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maintenance_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "parking_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_charges" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "move_in_date" DATE;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_reservation_id_key"
  ON "bookings" ("reservation_id") WHERE "reservation_id" IS NOT NULL;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "transaction_id" VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_id_key"
  ON "payments" ("transaction_id") WHERE "transaction_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
  "receipt_number" VARCHAR(80) NOT NULL UNIQUE,
  "payload" JSONB NOT NULL,
  "qr_code" TEXT NOT NULL,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "event_type" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "channel" VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS "payload" JSONB,
  ADD COLUMN IF NOT EXISTS "template_id" UUID,
  ADD COLUMN IF NOT EXISTS "reservation_id" VARCHAR(64);

CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(120) NOT NULL UNIQUE,
  "audience" VARCHAR(30) NOT NULL,
  "channel" VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
  "title_template" VARCHAR(200) NOT NULL,
  "body_template" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" VARCHAR(30) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "channel")
);

CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL,
  "level" VARCHAR(20) NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_devices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "platform" VARCHAR(30) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_delivery" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL,
  "channel" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL,
  "provider_response" JSONB,
  "delivered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_retry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL UNIQUE,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ NOT NULL,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_dead_letters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL UNIQUE,
  "reason" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notification_logs_notification_id_created_at_idx"
  ON "notification_logs" ("notification_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_devices_user_id_is_active_idx"
  ON "notification_devices" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "notification_delivery_notification_id_channel_idx"
  ON "notification_delivery" ("notification_id", "channel");
CREATE INDEX IF NOT EXISTS "notification_retry_next_attempt_at_idx"
  ON "notification_retry" ("next_attempt_at");

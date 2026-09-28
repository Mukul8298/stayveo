-- Payment architecture migration.
-- This migration intentionally does not delete existing payment rows. Before
-- applying it, inspect existing mock records and export/backup the database.

DO $$ BEGIN
  CREATE TYPE "payment_lifecycle_state" AS ENUM (
    'INITIATED', 'ORDER_CREATED', 'PROCESSING', 'CAPTURED', 'VERIFIED',
    'TRANSFER_PENDING', 'TRANSFERRED', 'COMPLETED', 'PAYMENT_FAILED',
    'VERIFICATION_FAILED', 'TRANSFER_FAILED', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_skip_status" AS ENUM ('ACTIVE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "lifecycle_state" "payment_lifecycle_state" NOT NULL DEFAULT 'INITIATED',
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "payment_gateway" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "provider_order_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "provider_payment_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "reservation_fee_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "platform_fee_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "owner_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "student_payable" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "commission_bearer" VARCHAR(20) NOT NULL DEFAULT 'OWNER',
  ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "transfer_status" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "last_webhook_event_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "tiffin_payments"
  ADD COLUMN IF NOT EXISTS "lifecycle_state" "payment_lifecycle_state" NOT NULL DEFAULT 'INITIATED',
  ADD COLUMN IF NOT EXISTS "plan_type" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "meals_per_day" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_renewal" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "commission_bearer" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "owner_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "transfer_status" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "last_webhook_event_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6);

ALTER TABLE "tiffin_kitchens"
  ADD COLUMN IF NOT EXISTS "monthly_one_meal_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "monthly_two_meal_price" DECIMAL(10,2);

ALTER TABLE "tiffin_customer_subscriptions"
  ADD COLUMN IF NOT EXISTS "lunch_end_date" DATE,
  ADD COLUMN IF NOT EXISTS "dinner_end_date" DATE;

ALTER TABLE "tiffin_subscription_renewal_logs"
  ADD COLUMN IF NOT EXISTS "meal_category" "meal_category";

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key"
  ON "payments"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_order_id_key"
  ON "payments"("provider_order_id") WHERE "provider_order_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_payment_id_key"
  ON "payments"("provider_payment_id") WHERE "provider_payment_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "payments_booking_id_lifecycle_state_idx"
  ON "payments"("booking_id", "lifecycle_state");
CREATE INDEX IF NOT EXISTS "payments_provider_id_status_created_at_idx"
  ON "payments"("provider_id", "status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_payments_provider_order_id_key"
  ON "tiffin_payments"("provider_order_id") WHERE "provider_order_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_payments_provider_payment_id_key"
  ON "tiffin_payments"("provider_payment_id") WHERE "provider_payment_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "payment_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(80) NOT NULL,
  "actor_user_id" UUID,
  "actor_provider_id" UUID,
  "payment_id" UUID,
  "tiffin_payment_id" UUID,
  "booking_id" UUID,
  "subscription_id" UUID,
  "renewal_id" UUID,
  "request_id" VARCHAR(128),
  "gateway_order_id" VARCHAR(128),
  "gateway_payment_id" VARCHAR(128),
  "base_amount" DECIMAL(10,2),
  "platform_fee" DECIMAL(10,2),
  "owner_amount" DECIMAL(10,2),
  "student_payable" DECIMAL(10,2),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_audit_logs_payment_id_created_at_idx" ON "payment_audit_logs"("payment_id", "created_at");
CREATE INDEX IF NOT EXISTS "payment_audit_logs_tiffin_payment_id_created_at_idx" ON "payment_audit_logs"("tiffin_payment_id", "created_at");
CREATE INDEX IF NOT EXISTS "payment_audit_logs_event_type_created_at_idx" ON "payment_audit_logs"("event_type", "created_at");
ALTER TABLE "payment_audit_logs" ADD CONSTRAINT "payment_audit_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_audit_logs" ADD CONSTRAINT "payment_audit_logs_tiffin_payment_id_fkey" FOREIGN KEY ("tiffin_payment_id") REFERENCES "tiffin_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(40) NOT NULL,
  "event_id" VARCHAR(128) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "signature_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB NOT NULL,
  "error_message" TEXT,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6),
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_webhook_events_event_id_key" UNIQUE ("event_id")
);
CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_event_type_received_at_idx" ON "payment_webhook_events"("provider", "event_type", "received_at");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_status_received_at_idx" ON "payment_webhook_events"("status", "received_at");

CREATE TABLE IF NOT EXISTS "payment_transfers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID,
  "tiffin_payment_id" UUID,
  "provider_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "gateway_transfer_id" VARCHAR(128),
  "amount" DECIMAL(10,2) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_transfers_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "payment_transfers_gateway_transfer_id_key" UNIQUE ("gateway_transfer_id")
);
CREATE INDEX IF NOT EXISTS "payment_transfers_provider_id_status_created_at_idx" ON "payment_transfers"("provider_id", "status", "created_at");
ALTER TABLE "payment_transfers" ADD CONSTRAINT "payment_transfers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transfers" ADD CONSTRAINT "payment_transfers_tiffin_payment_id_fkey" FOREIGN KEY ("tiffin_payment_id") REFERENCES "tiffin_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "tiffin_subscription_skips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "skip_date" DATE NOT NULL,
  "meal_category" "meal_category" NOT NULL,
  "meal_count" INTEGER NOT NULL DEFAULT 1,
  "status" "subscription_skip_status" NOT NULL DEFAULT 'ACTIVE',
  "renewal_applied" BOOLEAN NOT NULL DEFAULT FALSE,
  "owner_notified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_subscription_skips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tiffin_subscription_skips_subscription_id_skip_date_meal_category_key" UNIQUE ("subscription_id", "skip_date", "meal_category"),
  CONSTRAINT "tiffin_subscription_skips_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tiffin_subscription_skips_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_subscription_skips_student_id_status_skip_date_idx" ON "tiffin_subscription_skips"("student_id", "status", "skip_date");
CREATE INDEX IF NOT EXISTS "tiffin_subscription_skips_subscription_id_status_renewal_applied_idx" ON "tiffin_subscription_skips"("subscription_id", "status", "renewal_applied");

-- Tiffin reservations reuse the existing customer subscription aggregate.
-- Pending subscriptions represent reservations; confirmation atomically turns
-- them into active subscriptions after payment verification.

DO $$ BEGIN
  ALTER TYPE "tiffin_payment_status" ADD VALUE IF NOT EXISTS 'processing';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "tiffin_customer_subscriptions"
  ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6);

ALTER TABLE "tiffin_payments"
  ADD COLUMN IF NOT EXISTS "provider_order_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "provider_payment_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'INR';

CREATE INDEX IF NOT EXISTS "tiffin_customer_subscriptions_kitchen_id_status_start_date_idx"
  ON "tiffin_customer_subscriptions"("kitchen_id", "status", "start_date");

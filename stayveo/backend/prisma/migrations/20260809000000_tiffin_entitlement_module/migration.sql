-- Tiffin-only persistence. This migration intentionally does not touch PG tables.

DO $$ BEGIN CREATE TYPE "tiffin_food_type" AS ENUM ('veg', 'nonveg', 'jain', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "tiffin_food_type" ADD VALUE IF NOT EXISTS 'jain'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "meal_category" AS ENUM ('breakfast', 'lunch', 'dinner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_plan_type" AS ENUM ('weekly', 'monthly', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_subscription_status" AS ENUM ('active', 'paused', 'expired', 'cancelled', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kitchen_status" AS ENUM ('open', 'closed', 'temporarily_closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kitchen_verification_status" AS ENUM ('pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_delivery_type" AS ENUM ('self_delivery', 'delivery_partner', 'pickup_only', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "meal_log_status" AS ENUM ('scheduled', 'delivered', 'skipped', 'missed', 'cancelled', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_payment_method" AS ENUM ('upi', 'card', 'net_banking', 'wallet', 'cash'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_complaint_status" AS ENUM ('open', 'in_progress', 'resolved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tiffin_subscription_day_status" AS ENUM ('pending', 'partial', 'completed', 'skipped', 'missed', 'paused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "tiffin_kitchens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "kitchen_name" VARCHAR(200) NOT NULL,
  "kitchen_logo" TEXT,
  "cover_image" TEXT,
  "description" TEXT,
  "food_options" JSONB,
  "owner_name" VARCHAR(150) NOT NULL,
  "phone" VARCHAR(15) NOT NULL,
  "email" VARCHAR(255),
  "gst_number" VARCHAR(20),
  "fssai_license_number" VARCHAR(30),
  "address" TEXT,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "pincode" VARCHAR(10),
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "delivery_radius_km" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  "food_type" "tiffin_food_type" NOT NULL DEFAULT 'veg',
  "breakfast_available" BOOLEAN NOT NULL DEFAULT false,
  "lunch_available" BOOLEAN NOT NULL DEFAULT false,
  "dinner_available" BOOLEAN NOT NULL DEFAULT false,
  "meals_per_day" INTEGER NOT NULL DEFAULT 1,
  "security_deposit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "delivery_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "packing_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "extra_meal_price" DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  "is_sunday_closed" BOOLEAN NOT NULL DEFAULT false,
  "custom_weekly_off" VARCHAR(20),
  "allows_jain" BOOLEAN NOT NULL DEFAULT false,
  "allows_low_oil" BOOLEAN NOT NULL DEFAULT false,
  "allows_diabetic_diet" BOOLEAN NOT NULL DEFAULT false,
  "allows_high_protein" BOOLEAN NOT NULL DEFAULT false,
  "allows_custom_instructions" BOOLEAN NOT NULL DEFAULT true,
  "delivery_type" "tiffin_delivery_type" NOT NULL DEFAULT 'self_delivery',
  "pickup_available" BOOLEAN NOT NULL DEFAULT false,
  "cancellation_policy" TEXT,
  "refund_policy" TEXT,
  "status" "kitchen_status" NOT NULL DEFAULT 'open',
  "verification_status" "kitchen_verification_status" NOT NULL DEFAULT 'pending',
  "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "total_reviews" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "tiffin_kitchens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_kitchens_owner_id_key" ON "tiffin_kitchens"("owner_id");
CREATE INDEX IF NOT EXISTS "tiffin_kitchens_latitude_longitude_idx" ON "tiffin_kitchens"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "tiffin_kitchens_city_status_verification_status_idx" ON "tiffin_kitchens"("city", "status", "verification_status");

CREATE TABLE IF NOT EXISTS "tiffin_kitchen_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "image_url" TEXT NOT NULL, "caption" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_kitchen_images_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_kitchen_images_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_kitchen_images_kitchen_id_sort_order_idx" ON "tiffin_kitchen_images"("kitchen_id", "sort_order");

CREATE TABLE IF NOT EXISTS "tiffin_kitchen_meal_timings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "meal_category" "meal_category" NOT NULL, "start_time" VARCHAR(10) NOT NULL, "end_time" VARCHAR(10) NOT NULL, "cutoff_time" VARCHAR(10),
  CONSTRAINT "tiffin_kitchen_meal_timings_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_kitchen_meal_timings_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_kitchen_meal_timings_kitchen_id_meal_category_key" ON "tiffin_kitchen_meal_timings"("kitchen_id", "meal_category");

CREATE TABLE IF NOT EXISTS "tiffin_kitchen_weekly_menus" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "day_of_week" VARCHAR(10) NOT NULL, "meal_category" "meal_category" NOT NULL, "items" JSONB NOT NULL, "calories" INTEGER, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_kitchen_weekly_menus_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_kitchen_weekly_menus_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_kitchen_weekly_menus_kitchen_id_day_of_week_meal_category_key" ON "tiffin_kitchen_weekly_menus"("kitchen_id", "day_of_week", "meal_category");

CREATE TABLE IF NOT EXISTS "tiffin_kitchen_menu_histories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "weekly_menu_id" UUID NOT NULL, "previous_items" JSONB NOT NULL, "updated_by" UUID NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_kitchen_menu_histories_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_kitchen_menu_histories_weekly_menu_id_fkey" FOREIGN KEY ("weekly_menu_id") REFERENCES "tiffin_kitchen_weekly_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tiffin_subscription_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "plan_name" VARCHAR(150) NOT NULL, "plan_type" "tiffin_plan_type" NOT NULL, "duration_days" INTEGER NOT NULL, "total_meals" INTEGER NOT NULL, "price" DECIMAL(10,2) NOT NULL, "discount_price" DECIMAL(10,2), "description" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_subscription_plans_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_subscription_plans_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_subscription_plans_kitchen_id_is_active_idx" ON "tiffin_subscription_plans"("kitchen_id", "is_active");

CREATE TABLE IF NOT EXISTS "tiffin_customer_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_code" VARCHAR(30) NOT NULL, "kitchen_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "plan_id" UUID NOT NULL, "diet_preference" "tiffin_food_type" NOT NULL DEFAULT 'veg', "custom_instructions" TEXT, "opted_breakfast" BOOLEAN NOT NULL DEFAULT false, "opted_lunch" BOOLEAN NOT NULL DEFAULT false, "opted_dinner" BOOLEAN NOT NULL DEFAULT false, "delivery_address" TEXT, "delivery_latitude" DECIMAL(9,6), "delivery_longitude" DECIMAL(9,6), "start_date" DATE NOT NULL, "end_date" DATE NOT NULL, "total_meals_allocated" INTEGER NOT NULL, "meals_remaining" INTEGER NOT NULL, "meals_consumed" INTEGER NOT NULL DEFAULT 0, "meals_skipped" INTEGER NOT NULL DEFAULT 0, "total_entitled_days" INTEGER NOT NULL DEFAULT 28, "consumed_days" INTEGER NOT NULL DEFAULT 0, "remaining_days" INTEGER NOT NULL DEFAULT 28, "payment_status" "tiffin_payment_status" NOT NULL DEFAULT 'pending', "status" "tiffin_subscription_status" NOT NULL DEFAULT 'pending', "auto_renew" BOOLEAN NOT NULL DEFAULT false, "paused_at" TIMESTAMPTZ(6), "resumed_at" TIMESTAMPTZ(6), "cancelled_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "tiffin_customer_subscriptions_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_customer_subscriptions_subscription_code_key" UNIQUE ("subscription_code"), CONSTRAINT "tiffin_customer_subscriptions_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "tiffin_customer_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tiffin_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_customer_subscriptions_customer_id_status_idx" ON "tiffin_customer_subscriptions"("customer_id", "status");
CREATE INDEX IF NOT EXISTS "tiffin_customer_subscriptions_kitchen_id_status_end_date_idx" ON "tiffin_customer_subscriptions"("kitchen_id", "status", "end_date");

CREATE TABLE IF NOT EXISTS "tiffin_subscription_pause_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_id" UUID NOT NULL, "pause_start_date" DATE NOT NULL, "pause_end_date" DATE NOT NULL, "reason" TEXT, "resumed_early_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_subscription_pause_logs_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_subscription_pause_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_subscription_pause_logs_subscription_id_pause_start_date_idx" ON "tiffin_subscription_pause_logs"("subscription_id", "pause_start_date");

CREATE TABLE IF NOT EXISTS "tiffin_subscription_renewal_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_id" UUID NOT NULL, "old_end_date" DATE NOT NULL, "new_end_date" DATE NOT NULL, "added_meals" INTEGER NOT NULL, "payment_id" UUID, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_subscription_renewal_logs_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_subscription_renewal_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tiffin_subscription_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_id" UUID NOT NULL, "service_date" DATE NOT NULL, "status" "tiffin_subscription_day_status" NOT NULL DEFAULT 'pending', "consumed" BOOLEAN NOT NULL DEFAULT false, "consumed_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_subscription_days_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_subscription_days_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_subscription_days_subscription_id_service_date_key" ON "tiffin_subscription_days"("subscription_id", "service_date");
CREATE INDEX IF NOT EXISTS "tiffin_subscription_days_service_date_status_consumed_idx" ON "tiffin_subscription_days"("service_date", "status", "consumed");

CREATE TABLE IF NOT EXISTS "tiffin_meal_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_id" UUID NOT NULL, "kitchen_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "meal_date" DATE NOT NULL, "meal_category" "meal_category" NOT NULL, "subscription_day_id" UUID, "status" "meal_log_status" NOT NULL DEFAULT 'scheduled', "is_extra_meal" BOOLEAN NOT NULL DEFAULT false, "extra_meal_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "delivery_otp" VARCHAR(6), "delivered_at" TIMESTAMPTZ(6), "delivered_by_provider_id" UUID, "skipped_at" TIMESTAMPTZ(6), "missed_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_meal_logs_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_meal_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tiffin_meal_logs_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tiffin_meal_logs_subscription_day_id_fkey" FOREIGN KEY ("subscription_day_id") REFERENCES "tiffin_subscription_days"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_meal_logs_subscription_id_meal_date_meal_category_key" ON "tiffin_meal_logs"("subscription_id", "meal_date", "meal_category");
CREATE INDEX IF NOT EXISTS "tiffin_meal_logs_kitchen_id_meal_date_meal_category_status_idx" ON "tiffin_meal_logs"("kitchen_id", "meal_date", "meal_category", "status");
CREATE INDEX IF NOT EXISTS "tiffin_meal_logs_customer_id_meal_date_idx" ON "tiffin_meal_logs"("customer_id", "meal_date");

CREATE TABLE IF NOT EXISTS "tiffin_meal_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "meal_log_id" UUID NOT NULL, "delivery_person_name" VARCHAR(150), "delivery_person_phone" VARCHAR(15), "verified_otp" VARCHAR(6), "delivery_notes" TEXT, "proof_image_url" TEXT, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_meal_deliveries_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_meal_deliveries_meal_log_id_key" UNIQUE ("meal_log_id"), CONSTRAINT "tiffin_meal_deliveries_meal_log_id_fkey" FOREIGN KEY ("meal_log_id") REFERENCES "tiffin_meal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tiffin_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "subscription_id" UUID NOT NULL, "kitchen_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "transaction_id" VARCHAR(128), "idempotency_key" VARCHAR(128), "payment_gateway" VARCHAR(50), "payment_method" "tiffin_payment_method" NOT NULL DEFAULT 'upi', "status" "tiffin_payment_status" NOT NULL DEFAULT 'pending', "base_amount" DECIMAL(10,2) NOT NULL, "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "coupon_code" VARCHAR(30), "gst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "platform_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "packing_charge" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "delivery_charge" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "total_amount" DECIMAL(10,2) NOT NULL, "refund_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00, "paid_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_payments_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_payments_transaction_id_key" UNIQUE ("transaction_id"), CONSTRAINT "tiffin_payments_idempotency_key_key" UNIQUE ("idempotency_key"), CONSTRAINT "tiffin_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_payments_subscription_id_status_idx" ON "tiffin_payments"("subscription_id", "status");
CREATE INDEX IF NOT EXISTS "tiffin_payments_kitchen_id_status_paid_at_idx" ON "tiffin_payments"("kitchen_id", "status", "paid_at");
CREATE INDEX IF NOT EXISTS "tiffin_payments_customer_id_status_idx" ON "tiffin_payments"("customer_id", "status");

CREATE TABLE IF NOT EXISTS "tiffin_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "payment_id" UUID NOT NULL, "invoice_number" VARCHAR(60) NOT NULL, "pdf_url" TEXT, "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_invoices_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_invoices_payment_id_key" UNIQUE ("payment_id"), CONSTRAINT "tiffin_invoices_invoice_number_key" UNIQUE ("invoice_number"), CONSTRAINT "tiffin_invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "tiffin_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tiffin_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "payment_id" UUID NOT NULL, "refund_ref_id" VARCHAR(100) NOT NULL, "amount" DECIMAL(10,2) NOT NULL, "reason" TEXT, "status" VARCHAR(30) NOT NULL DEFAULT 'PROCESSED', "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_refunds_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_refunds_refund_ref_id_key" UNIQUE ("refund_ref_id"), CONSTRAINT "tiffin_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "tiffin_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tiffin_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "subscription_id" UUID, "rating" INTEGER NOT NULL, "comment" TEXT, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_reviews_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_reviews_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tiffin_reviews_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_reviews_kitchen_id_rating_idx" ON "tiffin_reviews"("kitchen_id", "rating");

CREATE TABLE IF NOT EXISTS "tiffin_complaints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ticket_number" VARCHAR(30) NOT NULL, "kitchen_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "subscription_id" UUID, "meal_log_id" UUID, "category" VARCHAR(80) NOT NULL DEFAULT 'Other', "subject" VARCHAR(200) NOT NULL, "description" TEXT NOT NULL, "status" "tiffin_complaint_status" NOT NULL DEFAULT 'open', "resolution_note" TEXT, "provider_response" TEXT, "resolved_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_complaints_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_complaints_ticket_number_key" UNIQUE ("ticket_number"), CONSTRAINT "tiffin_complaints_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tiffin_complaints_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tiffin_customer_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "tiffin_complaints_meal_log_id_fkey" FOREIGN KEY ("meal_log_id") REFERENCES "tiffin_meal_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_complaints_kitchen_id_status_idx" ON "tiffin_complaints"("kitchen_id", "status");

CREATE TABLE IF NOT EXISTS "tiffin_activity_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "kitchen_id" UUID NOT NULL, "user_id" UUID, "action" VARCHAR(100) NOT NULL, "description" TEXT NOT NULL, "metadata" JSONB, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_activity_logs_pkey" PRIMARY KEY ("id"), CONSTRAINT "tiffin_activity_logs_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "tiffin_kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tiffin_activity_logs_kitchen_id_created_at_idx" ON "tiffin_activity_logs"("kitchen_id", "created_at");

CREATE TABLE IF NOT EXISTS "tiffin_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "kitchen_id" UUID, "title" VARCHAR(200) NOT NULL, "message" TEXT NOT NULL, "type" VARCHAR(50) NOT NULL, "is_read" BOOLEAN NOT NULL DEFAULT false, "payload" JSONB, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tiffin_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tiffin_notifications_user_id_is_read_created_at_idx" ON "tiffin_notifications"("user_id", "is_read", "created_at");

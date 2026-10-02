BEGIN;

-- Keep the amount customers currently pay when an old discount was configured.
-- A plan's price becomes the only stored active price after this migration.
UPDATE "tiffin_subscription_plans"
SET "price" = "discount_price"
WHERE "discount_price" IS NOT NULL
  AND "plan_type"::text IN ('custom', 'weekly');

-- The generic monthly row did not distinguish one-meal from two-meal pricing.
-- The kitchen's explicit monthly one-meal price is the safe canonical mapping.
UPDATE "tiffin_subscription_plans" AS plan
SET "price" = kitchen."monthly_one_meal_price",
    "plan_name" = 'Monthly 1 Meal',
    "duration_days" = 30,
    "total_meals" = 30,
    "is_active" = plan."is_active" AND kitchen."monthly_one_meal_price" IS NOT NULL
FROM "tiffin_kitchens" AS kitchen
WHERE plan."kitchen_id" = kitchen."id"
  AND plan."plan_type"::text = 'monthly'
  AND kitchen."monthly_one_meal_price" IS NOT NULL;

CREATE TYPE "tiffin_plan_type_v2" AS ENUM (
  'daily_1_meal',
  'weekly_1_meal',
  'monthly_1_meal',
  'monthly_2_meals'
);

ALTER TABLE "tiffin_subscription_plans"
  ALTER COLUMN "plan_type" TYPE "tiffin_plan_type_v2"
  USING (
    CASE "plan_type"::text
      WHEN 'custom' THEN 'daily_1_meal'
      WHEN 'weekly' THEN 'weekly_1_meal'
      WHEN 'monthly' THEN 'monthly_1_meal'
    END
  )::"tiffin_plan_type_v2";

DROP TYPE "tiffin_plan_type";
ALTER TYPE "tiffin_plan_type_v2" RENAME TO "tiffin_plan_type";

UPDATE "tiffin_subscription_plans"
SET "plan_name" = 'Daily 1 Meal', "duration_days" = 1, "total_meals" = 1
WHERE "plan_type"::text = 'daily_1_meal';

UPDATE "tiffin_subscription_plans"
SET "plan_name" = 'Weekly 1 Meal', "duration_days" = 7, "total_meals" = 7
WHERE "plan_type"::text = 'weekly_1_meal';

-- If a provider only configured a monthly two-meal price, do not keep a generic
-- monthly row active as a substitute for a missing monthly one-meal price.
UPDATE "tiffin_subscription_plans" AS plan
SET "is_active" = false
FROM "tiffin_kitchens" AS kitchen
WHERE plan."kitchen_id" = kitchen."id"
  AND plan."plan_type"::text = 'monthly_1_meal'
  AND kitchen."monthly_one_meal_price" IS NULL;

-- Add the explicit two-meal monthly plan from the existing dedicated value.
INSERT INTO "tiffin_subscription_plans" (
  "kitchen_id", "plan_name", "plan_type", "duration_days", "total_meals",
  "price", "description", "is_active", "created_at", "updated_at"
)
SELECT
  kitchen."id", 'Monthly 2 Meals', 'monthly_2_meals', 30, 60,
  kitchen."monthly_two_meal_price", 'Price for two meals per day for a 30-day monthly plan.',
  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tiffin_kitchens" AS kitchen
WHERE kitchen."monthly_two_meal_price" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "tiffin_subscription_plans" AS plan
    WHERE plan."kitchen_id" = kitchen."id"
      AND plan."plan_type"::text = 'monthly_2_meals'
  );

-- Keep existing monthly subscriptions attached to the explicit two-meal plan
-- when their saved meal selection shows both lunch and dinner.
UPDATE "tiffin_customer_subscriptions" AS subscription
SET "plan_id" = two_meal_plan."id"
FROM "tiffin_subscription_plans" AS old_plan,
     "tiffin_subscription_plans" AS two_meal_plan
WHERE subscription."plan_id" = old_plan."id"
  AND old_plan."plan_type"::text = 'monthly_1_meal'
  AND subscription."opted_lunch" = true
  AND subscription."opted_dinner" = true
  AND two_meal_plan."kitchen_id" = subscription."kitchen_id"
  AND two_meal_plan."plan_type"::text = 'monthly_2_meals';

ALTER TABLE "tiffin_kitchens"
  DROP COLUMN "extra_meal_price",
  DROP COLUMN "monthly_one_meal_price",
  DROP COLUMN "monthly_two_meal_price";

ALTER TABLE "tiffin_subscription_plans"
  DROP COLUMN "discount_price";

ALTER TABLE "tiffin_meal_logs"
  DROP COLUMN "extra_meal_price";

COMMIT;

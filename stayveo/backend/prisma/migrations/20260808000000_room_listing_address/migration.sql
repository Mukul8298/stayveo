ALTER TABLE "room_listings"
  ADD COLUMN IF NOT EXISTS "address" VARCHAR(500);

-- Promote legacy onboarding PG records into the existing inventory-backed
-- listing table. This keeps existing properties visible in provider and
-- student flows without creating a second property or bed system.
INSERT INTO "room_listings" (
  "provider_id", "title", "description", "address", "room_type",
  "gender_preference", "price", "security_deposit", "reservation_fee",
  "minimum_stay_months", "number_of_beds", "platform_fee", "food_charges",
  "electricity_charges", "water_charges", "maintenance_charges",
  "parking_charges", "other_charges", "total_beds", "available_beds",
  "reserved_beds", "occupied_beds", "blocked_beds", "offline_beds",
  "floor", "amenities", "images", "is_active", "status", "created_at", "updated_at"
)
SELECT
  ps."provider_id", pg."pg_name", NULL, pg."address", pg."room_type",
  'unisex', pg."min_price", pg."security_deposit", pg."reservation_fee",
  pg."minimum_stay_months", pg."number_of_beds", 0, 0, 0, 0, 0, 0, 0,
  pg."number_of_beds", pg."number_of_beds", 0, 0, 0, 0, NULL,
  COALESCE(pg."amenities", ARRAY[]::TEXT[]), COALESCE(pg."photos", ARRAY[]::TEXT[]),
  true, 'active', now(), now()
FROM "pg_details" pg
JOIN "provider_services" ps ON ps."id" = pg."service_id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "room_listings" existing
  WHERE existing."provider_id" = ps."provider_id"
    AND existing."title" = pg."pg_name"
    AND existing."room_type" = pg."room_type"
);

-- Point historical bookings at the inventory row for the same property so
-- My Space, provider bookings, and bed counts all use one room identifier.
UPDATE "bookings" b
SET "room_id" = rl."id"
FROM "pg_details" pg
JOIN "provider_services" ps ON ps."id" = pg."service_id"
JOIN "room_listings" rl
  ON rl."provider_id" = ps."provider_id"
 AND rl."title" = pg."pg_name"
 AND rl."room_type" = pg."room_type"
WHERE b."room_id" = pg."id"
  AND b."provider_id" = ps."provider_id";

-- Reconcile reserved inventory from successful reservation payments without
-- counting multiple payment rows for the same booking more than once.
WITH paid_reservations AS (
  SELECT b."room_id", COUNT(DISTINCT b."id")::INTEGER AS paid_count
  FROM "bookings" b
  JOIN "payments" p ON p."booking_id" = b."id"
  WHERE p."status"::text = 'paid'
    AND b."room_id" IS NOT NULL
  GROUP BY b."room_id"
)
UPDATE "room_listings" rl
SET
  "reserved_beds" = GREATEST(rl."reserved_beds", paid_reservations.paid_count),
  "available_beds" = GREATEST(
    0,
    rl."total_beds" - GREATEST(rl."reserved_beds", paid_reservations.paid_count)
      - rl."occupied_beds" - rl."blocked_beds" - rl."offline_beds"
  ),
  "status" = CASE
    WHEN NOT rl."is_active" THEN 'closed'::room_status
    WHEN GREATEST(
      0,
      rl."total_beds" - GREATEST(rl."reserved_beds", paid_reservations.paid_count)
        - rl."occupied_beds" - rl."blocked_beds" - rl."offline_beds"
    ) = 0 THEN 'full'::room_status
    ELSE 'active'::room_status
  END
FROM paid_reservations
WHERE rl."id" = paid_reservations."room_id";

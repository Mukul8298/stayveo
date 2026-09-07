-- Prevent concurrent/retried reservations from creating two open student
-- relationships for the same Tiffin kitchen. Historical cancelled/expired
-- subscriptions remain available for reporting and future re-subscription.
CREATE UNIQUE INDEX IF NOT EXISTS "tiffin_customer_subscriptions_one_open_per_customer_idx"
  ON "tiffin_customer_subscriptions"("kitchen_id", "customer_id")
  WHERE "deleted_at" IS NULL AND "status" IN ('pending', 'active', 'paused');

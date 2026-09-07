CREATE TABLE IF NOT EXISTS "saved_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pg_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_listings_user_id_pg_id_key"
    ON "saved_listings"("user_id", "pg_id");

CREATE INDEX IF NOT EXISTS "saved_listings_user_id_created_at_idx"
    ON "saved_listings"("user_id", "created_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'saved_listings_user_id_fkey'
    ) THEN
        ALTER TABLE "saved_listings"
            ADD CONSTRAINT "saved_listings_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'saved_listings_pg_id_fkey'
    ) THEN
        ALTER TABLE "saved_listings"
            ADD CONSTRAINT "saved_listings_pg_id_fkey"
            FOREIGN KEY ("pg_id") REFERENCES "pg_details"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

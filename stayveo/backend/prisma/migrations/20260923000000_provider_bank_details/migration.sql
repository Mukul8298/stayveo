-- One bank-details record per existing provider onboarding profile.
-- Account numbers are encrypted by the application before insertion.

CREATE TABLE IF NOT EXISTS "provider_bank_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "account_holder_name" VARCHAR(200) NOT NULL,
    "account_number" VARCHAR(512) NOT NULL,
    "ifsc_code" VARCHAR(11) NOT NULL,
    "bank_name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_bank_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_bank_details_provider_id_key"
    ON "provider_bank_details"("provider_id");

CREATE INDEX IF NOT EXISTS "provider_bank_details_updated_at_idx"
    ON "provider_bank_details"("updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_bank_details_provider_id_fkey'
  ) THEN
    ALTER TABLE "provider_bank_details"
      ADD CONSTRAINT "provider_bank_details_provider_id_fkey"
      FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

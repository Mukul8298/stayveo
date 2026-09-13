-- Surgical migration from phone-only authentication to email/password/OTP.
-- Existing phone numbers, user IDs, profiles, and provider relations remain.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "email_auth_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "role" "user_role" NOT NULL,
  "purpose" VARCHAR(32) NOT NULL,
  "otp_hash" VARCHAR(64) NOT NULL,
  "password_hash" VARCHAR(255),
  "user_id" UUID,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_auth_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_auth_challenges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_auth_challenges_email_role_purpose_idx"
  ON "email_auth_challenges"("email", "role", "purpose");
CREATE INDEX IF NOT EXISTS "email_auth_challenges_expires_at_idx"
  ON "email_auth_challenges"("expires_at");

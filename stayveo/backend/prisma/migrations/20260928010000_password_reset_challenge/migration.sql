ALTER TABLE "email_auth_challenges"
  ADD COLUMN "verified_at" TIMESTAMPTZ(6),
  ADD COLUMN "reset_token_hash" VARCHAR(64);

CREATE INDEX "email_auth_challenges_reset_token_hash_idx"
  ON "email_auth_challenges" ("reset_token_hash");

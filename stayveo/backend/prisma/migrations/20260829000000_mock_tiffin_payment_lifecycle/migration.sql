-- Complete the existing Tiffin payment state machine for development checkout.
-- The payment table is reused; no duplicate payment table is created.
DO $$ BEGIN
  ALTER TYPE "tiffin_payment_status" ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

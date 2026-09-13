// ─── OTP Utilities ──────────────────────────────────────────────────────
// Cryptographically secure 4-digit OTP generation, SHA-256 hashing for
// storage, and constant-time comparison for verification.
// ────────────────────────────────────────────────────────────────────────

import { randomInt, createHash, timingSafeEqual } from 'node:crypto';

/** Generate a cryptographically random 4-digit OTP (1000–9999). */
export function generateOtp(): string {
  return String(randomInt(1000, 10000)); // upper bound is exclusive → 1000..9999
}

/** SHA-256 hash an OTP for safe server-side storage. */
export function hashOtp(otp: number | string): string {
  return createHash('sha256').update(String(otp)).digest('hex');
}

/** Constant-time comparison of a submitted OTP against a stored hash. */
export function verifyOtp(otp: number | string, storedHash: string): boolean {
  const submitted = hashOtp(otp);
  try {
    return timingSafeEqual(Buffer.from(submitted), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

// ─── Auth Zod Schemas ───────────────────────────────────────────────────
// Validates email + password + role authentication requests.
// ────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const emailField = z
  .string()
  .email('Please enter a valid email address')
  .transform((v) => v.trim().toLowerCase());

const roleField = z.enum(['STUDENT', 'PROVIDER']);

/** POST /auth/start-auth — begin login or signup */
export const startAuthSchema = z.object({
  email: emailField,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: roleField,
});

const otpField = z.union([
  z.string().length(4, 'OTP must be 4 digits'),
  z.number().int().min(1000).max(9999).transform((v) => String(v)),
]);

/** POST /auth/verify-otp — verify the 4-digit email OTP */
export const verifyOtpSchema = z.object({
  email: emailField,
  otp: otpField,
  role: roleField,
});

/** POST /auth/resend-otp — request a new OTP */
export const resendOtpSchema = z.object({
  email: emailField,
  role: roleField,
});

export type StartAuthInput = z.infer<typeof startAuthSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

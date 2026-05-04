// ─── Auth Zod Schemas ───────────────────────────────────────────────────

import { z } from 'zod';

/** POST /auth/send-otp */
export const sendOtpSchema = z.object({
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
});

/** POST /auth/verify-otp */
export const verifyOtpSchema = z.object({
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
  otp: z.string()
    .min(4, 'OTP must be at least 4 digits')
    .max(6, 'OTP must not exceed 6 digits'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ─── Email Service (Resend) ─────────────────────────────────────────────
// Sends transactional emails via the Resend API.
// All calls happen server-side only — RESEND_API_KEY is never exposed.
// ────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend';

const TEMPLATE_ID = 'bee68e71-93d9-4cc3-ba73-8f917415455d';
const FROM_ADDRESS = 'StayVeo <verify@stayveo.in>';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const error = new Error('OTP email service is not configured');
      Object.assign(error, { statusCode: 503, code: 'OTP_EMAIL_NOT_CONFIGURED' });
      throw error;
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

/**
 * Send a 4-digit OTP verification email via Resend.
 *
 * @param to    Recipient email address
 * @param otp   4-digit OTP as a **number** (template expects numeric type)
 * @param name  Optional display name for the template greeting
 * @returns     The Resend email ID on success
 */
export async function sendOtpEmail(
  to: string,
  otp: number | string,
  name?: string,
): Promise<string> {
  const resend = getResend();

  const variables: Record<string, unknown> = { otp };
  if (name) {
    variables.name = name;
  }

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: 'Your StayVeo verification code',
    html: `<p>Your StayVeo verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
    headers: {
      'X-Entity-Ref-ID': `stayveo-otp-${Date.now()}`,
    },
  });

  if (error) {
    const deliveryError = new Error('OTP email service is temporarily unavailable');
    Object.assign(deliveryError, { statusCode: 502, code: 'OTP_EMAIL_DELIVERY_FAILED', cause: error });
    throw deliveryError;
  }

  if (!data?.id) {
    const deliveryError = new Error('OTP email service returned an invalid response');
    Object.assign(deliveryError, { statusCode: 502, code: 'OTP_EMAIL_INVALID_RESPONSE' });
    throw deliveryError;
  }

  console.log(`OTP email sent successfully, Resend ID: ${data.id}`);
  return data.id;
}

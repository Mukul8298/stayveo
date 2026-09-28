import crypto from 'node:crypto';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function envValue(name: string) {
  return String(process.env[name] || '').trim().replace(/,+$/, '');
}

function credentials() {
  const keyId = envValue('key_id');
  const keySecret = envValue('key_secret');
  if (!keyId || !keySecret) {
    throw { statusCode: 503, message: 'Razorpay server credentials are not configured' };
  }
  return { keyId, keySecret };
}

function hexSignature(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected || '', 'utf8');
  const right = Buffer.from(actual || '', 'utf8');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

async function request(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw { statusCode: 502, message: payload?.error?.description || 'Razorpay request failed', details: payload };
  }
  return payload;
}

export const razorpayClient = {
  keyId() {
    return credentials().keyId;
  },

  createOrder(input: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.receipt.slice(0, 40),
        payment_capture: 1,
        notes: input.notes,
      }),
    });
  },

  fetchPayment(paymentId: string) {
    return request(`/payments/${encodeURIComponent(paymentId)}`);
  },

  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
    const { keySecret } = credentials();
    return signaturesMatch(hexSignature(`${orderId}|${paymentId}`, keySecret), signature);
  },

  verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = envValue('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) throw { statusCode: 503, message: 'Razorpay webhook secret is not configured' };
    return signaturesMatch(hexSignature(rawBody, secret), signature);
  },
};

// ─── Provider Onboarding API ────────────────────────────────────────────
// All calls target the /api/provider prefix (NOT /api/v1).
// ────────────────────────────────────────────────────────────────────────

const PROVIDER_API = import.meta.env.VITE_PROVIDER_URL || 'http://localhost:3000/api/provider';

async function providerRequest(endpoint, { method = 'POST', body, phone } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (phone) headers['x-provider-phone'] = phone;

  const res = await fetch(`${PROVIDER_API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Something went wrong');
  return json;
}

// ── OTP ─────────────────────────────────────────────────────────────────

export function providerSendOtp(phone) {
  return providerRequest('/send-otp', { body: { phone } });
}

export function providerVerifyOtp(phone, otp) {
  return providerRequest('/verify-otp', { body: { phone, otp } });
}

// ── Onboarding Steps ────────────────────────────────────────────────────

export function saveBasicInfo({ name, phone, email }) {
  return providerRequest('/basic-info', { body: { name, phone, email } });
}

export function saveServices(phone, services) {
  return providerRequest('/services', { body: { services }, phone });
}

export function saveServiceDetails(phone, type, data) {
  return providerRequest('/service-details', { body: { type, data }, phone });
}

export function savePhotos(phone, type, photos) {
  return providerRequest('/photos', { body: { type, photos }, phone });
}

export function verifyIdentity(phone, idType, idNumber) {
  return providerRequest('/verify-id', { body: { idType, idNumber }, phone });
}

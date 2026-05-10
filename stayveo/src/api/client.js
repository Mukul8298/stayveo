// ─── StayVeo API Client ─────────────────────────────────────────────────
// Central HTTP client for all backend calls.
// All responses follow { success, data, message } format.
// ────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function request(endpoint, options = {}) {
  const { method = 'GET', body, userId } = options;

  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || 'Something went wrong');
  }

  return json;
}

// ── Auth ────────────────────────────────────────────────────────────────

export function sendOtp(phone_number) {
  return request('/auth/send-otp', { method: 'POST', body: { phone_number } });
}

export function verifyOtp(phone_number, otp) {
  return request('/auth/verify-otp', { method: 'POST', body: { phone_number, otp } });
}

// ── Student Profile ─────────────────────────────────────────────────────

export function createStudentProfile(userId, profileData) {
  return request('/student/profile', { method: 'POST', body: profileData, userId });
}

export function getStudentProfile(userId) {
  return request('/student/profile', { method: 'GET', userId });
}

export function updateStudentProfile(userId, profileData) {
  return request('/student/profile', { method: 'PUT', body: profileData, userId });
}

export function getCurrentUserProfile(userId) {
  return request('/users/me', { method: 'GET', userId });
}

export function updateUserProfile(profileData) {
  return request('/user/update-profile', { method: 'PUT', body: profileData });
}

// ── Alias for spec compatibility ────────────────────────────────────────
export const updateProfile = updateUserProfile;

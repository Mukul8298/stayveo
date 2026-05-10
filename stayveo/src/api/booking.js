// ─── Booking & Dashboard API ────────────────────────────────────────────
// API functions for bookings, visits, payments, profile views, and
// provider dashboard stats.
// ────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function request(endpoint, { method = 'GET', body, userId, providerId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Something went wrong');
  return json;
}

// ── Bookings ────────────────────────────────────────────────────────────

export function createBooking(userId, bookingData) {
  return request('/bookings', { method: 'POST', body: bookingData, userId });
}

export function getBooking(id) {
  return request(`/bookings/${id}`);
}

export function getProviderBookings(providerId, { status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request(`/bookings/provider/${providerId}?${params}`);
}

export function getUserBookings(userId, { status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request(`/bookings/user?${params}`, { userId });
}

export function updateBookingStatus(bookingId, status) {
  return request(`/bookings/${bookingId}/status`, { method: 'PATCH', body: { status } });
}

export function getBookingStats(providerId) {
  return request(`/bookings/stats/${providerId}`);
}

// ── Visit Requests ──────────────────────────────────────────────────────

export function createVisitRequest(userId, visitData) {
  return request('/visits', { method: 'POST', body: visitData, userId });
}

export function getProviderVisits(providerId) {
  return request(`/visits/provider/${providerId}`);
}

export function getBookingVisits(bookingId) {
  return request(`/visits/booking/${bookingId}`);
}

export function updateVisitStatus(visitId, status) {
  return request(`/visits/${visitId}/status`, { method: 'PATCH', body: { status } });
}

// ── Payments & Earnings ─────────────────────────────────────────────────

export function createPayment(paymentData) {
  return request('/payments', { method: 'POST', body: paymentData });
}

export function getProviderPayments(providerId) {
  return request(`/payments/provider/${providerId}`);
}

export function getProviderEarnings(providerId) {
  return request(`/payments/earnings/${providerId}`);
}

// ── Profile Views ───────────────────────────────────────────────────────

export function recordProfileView(providerId, viewerId) {
  return request(`/profile-views/${providerId}`, { method: 'POST', userId: viewerId });
}

export function getProfileViewCount(providerId) {
  return request(`/profile-views/${providerId}/count`);
}

// ── Combined Dashboard Stats ────────────────────────────────────────────

export async function getProviderDashboardStats(providerId) {
  const [bookingStats, viewCount, earnings] = await Promise.all([
    getBookingStats(providerId).then(r => r.data).catch(() => ({ total: 0, new: 0, accepted: 0, in_progress: 0, completed: 0 })),
    getProfileViewCount(providerId).then(r => r.data).catch(() => ({ total: 0, unique: 0 })),
    getProviderEarnings(providerId).then(r => r.data).catch(() => ({ total: 0, thisMonth: 0, lastMonth: 0 })),
  ]);

  return {
    bookings: bookingStats,
    profileViews: viewCount,
    earnings,
  };
}

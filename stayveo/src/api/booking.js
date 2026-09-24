// ─── Booking & Dashboard API ────────────────────────────────────────────
// API functions for bookings, visits, payments, profile views, and
// provider dashboard stats.
// ────────────────────────────────────────────────────────────────────────

import { API_BASES } from '../config/api.js';

async function request(endpoint, { method = 'GET', body, userId, providerPhone } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  if (providerPhone) headers['x-provider-phone'] = providerPhone;

  let lastError;

  for (const baseUrl of API_BASES) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `Request failed with status ${res.status}`);
      }
      return json;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach the booking API server');
}

// ── Bookings ────────────────────────────────────────────────────────────

export function createBooking(userId, bookingData) {
  return request('/bookings', { method: 'POST', body: bookingData, userId });
}

export function getBooking(id) {
  return request(`/bookings/${id}`);
}

export function getBookingSummary(id) {
  return request(`/bookings/${id}/summary`);
}

export function getProviderBookings(providerId, { status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request(`/bookings/provider/${providerId}?${params}`);
}

export function getCurrentProviderBookings(providerPhone, { status, page = 1, limit = 50 } = {}) {
  void providerPhone;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request(`/bookings/provider/me?${params}`);
}

export function getUserBookings(userId, { status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request(`/bookings/user?${params}`, { userId });
}

export function updateBookingStatus(bookingId, status, providerPhone) {
  void providerPhone;
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

export function createPayment(paymentData, userId) {
  return request('/payments', { method: 'POST', body: paymentData, userId });
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
  void providerId;
  const response = await request('/provider/dashboard');
  return response?.data ?? {
    bookings: { total: 0, new: 0, accepted: 0, confirmed: 0, in_progress: 0, completed: 0, thisMonthRevenue: 0 },
    profileViews: { total: 0, unique: 0 },
    earnings: { thisMonth: 0 },
  };
}

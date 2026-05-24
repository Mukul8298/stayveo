// ─── Provider Onboarding + Profile API ──────────────────────────────────
// All calls target the /api/provider prefix (NOT /api/v1).
// Single source of truth for all provider HTTP requests.
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

// ── Profile Dashboard ────────────────────────────────────────────────────
// These are called by ProviderProfile.jsx to show real data.

/**
 * Fetch the 3 dashboard stats (activeListings, totalBookings, totalEarnings).
 * Uses GET because we are only reading — not mutating anything.
 */
export function getProviderDashboardStats(phone) {
  return providerRequest('/dashboard-stats', { method: 'GET', phone });
}

/**
 * Fetch current business details to pre-fill the Business Details edit form.
 */
export function getProviderBusinessDetails(phone) {
  return providerRequest('/business-details', { method: 'GET', phone });
}

/**
 * Save updated business details. Uses PUT — we are fully replacing the fields.
 * Body: { name?, businessName?, address?, contactNumber?, email?, description? }
 */
export function updateProviderBusinessDetails(phone, data) {
  return providerRequest('/business-details', { method: 'PUT', body: data, phone });
}

// ── Room Listings (Inventory Management) ────────────────────────────────
// Provider dashboard: create, read, update, toggle, delete room listings.
// These map directly to the room_listings table via the new module.

/** Fetch all listings for this provider (all statuses: ACTIVE/FULL/CLOSED) */
export function getRoomListings(phone) {
  return providerRequest('/room-listings', { method: 'GET', phone });
}

/** Fetch a single listing by ID (for the edit form prefill) */
export function getRoomListing(phone, id) {
  return providerRequest(`/room-listings/${id}`, { method: 'GET', phone });
}

/** Create a new room listing */
export function createRoomListing(phone, data) {
  return providerRequest('/room-listings', { method: 'POST', body: data, phone });
}

/** Full update of a listing (PUT — all editable fields) */
export function updateRoomListing(phone, id, data) {
  return providerRequest(`/room-listings/${id}`, { method: 'PUT', body: data, phone });
}

/**
 * Toggle listing visibility (PATCH — one field only).
 * Sends { isActive: boolean }. Server derives the new status.
 */
export function toggleRoomListing(phone, id, isActive) {
  return providerRequest(`/room-listings/${id}/toggle`, {
    method: 'PATCH',
    body: { isActive },
    phone,
  });
}

/** Soft-delete a listing (marks as CLOSED, not a real DB delete) */
export function deleteRoomListing(phone, id) {
  return providerRequest(`/room-listings/${id}`, { method: 'DELETE', phone });
}

// ── Generic Service Inventory ───────────────────────────────────────────
// These endpoints are the scalable contract for tiffin/laundry/cleaning.
// Room listings keep their mature room-listings endpoints because they have
// bed inventory logic and richer booking semantics.

export function getProviderServiceItems(phone, serviceType) {
  return providerRequest(`/services/${serviceType.toLowerCase()}/items`, { method: 'GET', phone });
}

export function getProviderServiceItem(phone, serviceType, id) {
  return providerRequest(`/services/${serviceType.toLowerCase()}/items/${id}`, { method: 'GET', phone });
}

export function createProviderServiceItem(phone, serviceType, data) {
  return providerRequest(`/services/${serviceType.toLowerCase()}/items`, { method: 'POST', body: data, phone });
}

export function updateProviderServiceItem(phone, serviceType, id, data) {
  return providerRequest(`/services/${serviceType.toLowerCase()}/items/${id}`, { method: 'PUT', body: data, phone });
}

export function toggleProviderServiceItem(phone, serviceType, id, isActive) {
  return providerRequest(`/services/${serviceType.toLowerCase()}/items/${id}/toggle`, {
    method: 'PATCH',
    body: { isActive },
    phone,
  });
}

// ─── Provider Onboarding + Profile API ──────────────────────────────────
// All calls target the /api/provider prefix (NOT /api/v1).
// Single source of truth for all provider HTTP requests.
// ────────────────────────────────────────────────────────────────────────

import { PROVIDER_API_BASES } from '../config/api.js';

class ProviderApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'ProviderApiError';
    this.status = status;
    this.details = details;
  }
}

async function providerRequest(endpoint, { method = 'POST', body, phone } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (phone) headers['x-provider-phone'] = phone;

  let lastError;

  for (const baseUrl of PROVIDER_API_BASES) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const message = json?.message || `Request failed with status ${res.status}`;
        throw new ProviderApiError(message, res.status, json);
      }
      return json;
    } catch (error) {
      if (error instanceof ProviderApiError) {
        throw error; // Server responded with error status — throw immediately
      }
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach the provider API');
}

// ── OTP ─────────────────────────────────────────────────────────────────

export function providerSendOtp(email, password) {
  return providerRequest('/send-otp', { body: { email, password } });
}

export function providerVerifyOtp(email, otp) {
  return providerRequest('/verify-otp', { body: { email, otp } });
}

export function providerResendOtp(email) {
  return providerRequest('/resend-otp', { body: { email } });
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

/** Atomically add or remove total bed capacity. */
export function adjustRoomListingInventory(phone, id, delta) {
  return providerRequest(`/room-listings/${id}/inventory`, {
    method: 'PATCH',
    body: { delta },
    phone,
  });
}

/** Soft-delete a listing (marks as CLOSED, not a real DB delete) */
export function deleteRoomListing(phone, id) {
  return providerRequest(`/room-listings/${id}`, { method: 'DELETE', phone });
}

// ── Generic Service Inventory ───────────────────────────────────────────
// These endpoints are the scalable contract for Tiffin service inventory.
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

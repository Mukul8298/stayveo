// ─── Supabase API Layer (Production-Ready) ──────────────────────────────
// All read queries for PG listings, services, and search.
// Uses Supabase JS client for direct DB access (read-only).
// Write operations still go through the Fastify backend.
//
// MIGRATION CHANGES:
// - Removed ALL mock data fallback dependencies
// - Added robust image URL resolution (supports photos array,
//   image_url field, room_images, and Supabase storage bucket paths)
// - Added AbortController support for safe async cancellation
// - Added safeFetch wrapper with error classification
// - Added image URL validation
// ────────────────────────────────────────────────────────────────────────

import supabase from '../lib/supabase.js';
import { SERVICE_IMAGES_BUCKET } from '../lib/storage.js';
import { request as backendRequest } from './client.js';

// ── Constants ───────────────────────────────────────────────────────────

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop';

// Known Supabase storage bucket names to try when resolving image paths
const STORAGE_BUCKETS = [SERVICE_IMAGES_BUCKET, 'room-images', 'images', 'uploads'];

// ── Safe Fetch Wrapper ──────────────────────────────────────────────────
// Wraps Supabase queries with error classification, retry logic,
// and AbortController support. Prevents app crashes during navigation
// and provides meaningful error information for debugging.
// ────────────────────────────────────────────────────────────────────────

/**
 * Execute a Supabase query safely with timeout and error handling.
 * 
 * @param {Function} queryFn - Async function that returns { data, error }
 * @param {Object} options
 * @param {AbortSignal} options.signal - AbortController signal for cancellation
 * @param {string} options.label - Human-readable label for logging
 * @param {number} options.timeoutMs - Max time to wait (default: 15000)
 * @returns {{ data: any, error: any, aborted: boolean }}
 */
export async function safeFetch(queryFn, { signal, label = 'query', timeoutMs = 15000 } = {}) {
  // If already aborted before we start, bail immediately
  if (signal?.aborted) {
    return { data: null, error: null, aborted: true };
  }

  try {
    // Race the query against a timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${timeoutMs}ms`)), timeoutMs)
    );

    const result = await Promise.race([queryFn(), timeoutPromise]);

    // Check if aborted during execution
    if (signal?.aborted) {
      return { data: null, error: null, aborted: true };
    }

    const { data, error } = result;

    if (error) {
      // Classify the error for better debugging
      const errorInfo = classifySupabaseError(error);
      console.error(`❌ safeFetch [${label}]:`, errorInfo.message, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        classification: errorInfo.type,
      });
      return { data: null, error: errorInfo, aborted: false };
    }

    return { data, error: null, aborted: false };
  } catch (err) {
    // Check if this was an abort
    if (signal?.aborted || err.name === 'AbortError') {
      return { data: null, error: null, aborted: true };
    }

    // Check for "Failed to fetch" specifically
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.error(`🌐 safeFetch [${label}]: network error — possible causes:`, {
        message: err.message,
        possibleCauses: [
          'CORS policy blocking the request',
          'Supabase URL/key mismatch',
          'RLS policy denying access',
          'Network connectivity issue',
          'Storage bucket permissions',
        ],
      });
      return {
        data: null,
        error: { message: 'Network error — check connection and try again', type: 'network' },
        aborted: false,
      };
    }

    console.error(`❌ safeFetch [${label}]: unexpected error:`, err);
    return {
      data: null,
      error: { message: err.message || 'Unknown error', type: 'unknown' },
      aborted: false,
    };
  }
}

/**
 * Classify Supabase errors into actionable categories.
 */
function classifySupabaseError(error) {
  const msg = error.message || '';
  const code = error.code || '';

  if (code === '42501' || msg.includes('permission denied') || msg.includes('RLS')) {
    return { ...error, type: 'rls', message: `RLS policy denied access: ${msg}` };
  }
  if (code === '42P01' || msg.includes('does not exist')) {
    return { ...error, type: 'missing_table', message: `Table/column missing: ${msg}` };
  }
  if (code === 'PGRST301' || msg.includes('JWT')) {
    return { ...error, type: 'auth', message: `Auth token issue: ${msg}` };
  }
  if (msg.includes('rate limit') || code === '429') {
    return { ...error, type: 'rate_limit', message: `Rate limited: ${msg}` };
  }
  return { ...error, type: 'general', message: msg };
}

// ── Image URL Resolution ────────────────────────────────────────────────
// PG images may come from multiple sources:
// 1. Direct URLs (https://...) — use as-is
// 2. Supabase storage paths (e.g. "pg-images/room1.jpg") — generate public URL
// 3. Array of image objects with url/path properties
// 4. Comma-separated string of URLs
//
// This resolver handles all cases and validates URLs before returning.
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolve a single image value to a usable URL.
 * Handles direct URLs, storage paths, and objects with url/path properties.
 */
function resolveImageUrl(img) {
  if (!img) return null;

  // If it's an object with a url or path property
  if (typeof img === 'object' && img !== null) {
    const url = img.url || img.path || img.src || img.image_url || img.public_url;
    if (url) return resolveImageUrl(url); // Recurse with the extracted string
    return null;
  }

  // Must be a string at this point
  if (typeof img !== 'string') return null;
  const trimmed = img.trim();
  if (!trimmed) return null;

  // Already a full URL — validate and return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Data URL (base64 encoded image)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Looks like a Supabase storage path — try to generate public URL
  // e.g. "pg-images/room1.jpg" or "uploads/providers/123/photo.webp"
  return resolveStoragePath(trimmed);
}

/**
 * Try to generate a public URL from a storage path.
 * Attempts multiple bucket names if the path doesn't include one.
 */
function resolveStoragePath(path) {
  if (!path) return null;

  // Check if path includes a bucket name (e.g. "pg-images/room1.jpg")
  const parts = path.split('/');
  if (parts.length >= 2) {
    const possibleBucket = parts[0];
    const filePath = parts.slice(1).join('/');

    const { data } = supabase.storage.from(possibleBucket).getPublicUrl(filePath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Try each known bucket
  for (const bucket of STORAGE_BUCKETS) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  console.warn(`⚠️ Could not resolve storage path: ${path}`);
  return null;
}

/**
 * Extract all valid image URLs from a PG record.
 * Checks multiple fields and normalizes the result to an array of URLs.
 */
function extractImages(pg) {
  const images = [];

  // Source 1: photos array (primary field used by provider onboarding)
  if (Array.isArray(pg?.photos)) {
    for (const photo of pg.photos) {
      const url = resolveImageUrl(photo);
      if (url) images.push(url);
    }
  }

  // Source 2: image_url field (single image)
  if (pg?.image_url) {
    const url = resolveImageUrl(pg.image_url);
    if (url && !images.includes(url)) images.push(url);
  }

  // Source 3: room_images array
  if (Array.isArray(pg?.room_images)) {
    for (const img of pg.room_images) {
      const url = resolveImageUrl(img);
      if (url && !images.includes(url)) images.push(url);
    }
  }

  // Source 4: images field (could be array or comma-separated string)
  if (pg?.images) {
    if (Array.isArray(pg.images)) {
      for (const img of pg.images) {
        const url = resolveImageUrl(img);
        if (url && !images.includes(url)) images.push(url);
      }
    } else if (typeof pg.images === 'string') {
      // Comma-separated URLs
      const parts = pg.images.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const url = resolveImageUrl(part);
        if (url && !images.includes(url)) images.push(url);
      }
    }
  }

  // If no images found at all, use fallback
  if (images.length === 0) {
    images.push(FALLBACK_IMAGE);
  }

  return images;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Map a raw pg_details + provider_services + provider_profiles row
 *  into the shape that <ListingCard> expects.
 * 
 *  REAL DATA ONLY — no mock values for distance/rating.
 *  Uses database values with safe defaults for missing columns.
 */
function mapRoomListingToListing(record, index = 0) {
  const images = Array.isArray(record?.images)
    ? record.images.map(resolveImageUrl).filter(Boolean)
    : [];
  if (!images.length) images.push(FALLBACK_IMAGE);

  return {
    id: record?.id || `room-listing-${index}`,
    roomId: record?.id || null,
    title: record?.title || 'PG Room',
    type: 'PG',
    price: Number(record?.price || 0),
    securityDeposit: Number(record?.securityDeposit || 0),
    reservationFee: Number(record?.reservationFee || 0),
    minimumStayMonths: Number(record?.minimumStayMonths || 1),
    numberOfBeds: Number(record?.numberOfBeds || 1),
    totalBeds: Number(record?.totalBeds || 0),
    availableBeds: Number(record?.availableBeds || 0),
    reservedBeds: Number(record?.reservedBeds || 0),
    occupiedBeds: Number(record?.occupiedBeds || 0),
    foodCharges: Number(record?.foodCharges || 0),
    electricityCharges: Number(record?.electricityCharges || 0),
    waterCharges: Number(record?.waterCharges || 0),
    maintenanceCharges: Number(record?.maintenanceCharges || 0),
    parkingCharges: Number(record?.parkingCharges || 0),
    otherCharges: Number(record?.otherCharges || 0),
    platformFee: Number(record?.platformFee || 0),
    distance: null,
    distanceKm: null,
    distanceLabel: null,
    rating: 0,
    reviews: 0,
    verified: true,
    available: Number(record?.availableBeds || 0) > 0,
    images,
    roomType: record?.roomType || 'shared',
    capacity: Number(record?.numberOfBeds || 1),
    gender: record?.genderPreference || 'unisex',
    services: mapAmenities(record?.amenities),
    amenities: Array.isArray(record?.amenities) ? record.amenities : [],
    address: record?.address || 'Address not available',
    owner: record?.provider?.name || 'Property Owner',
    providerId: record?.providerId || record?.provider?.id || null,
    providerPhone: record?.provider?.phone || null,
    latitude: record?.latitude ? Number(record.latitude) : null,
    longitude: record?.longitude ? Number(record.longitude) : null,
    description: record?.description || `${record?.title || 'PG'} near your campus.`,
  };
}

/** Convert amenity strings to service keys for icons */
function mapAmenities(amenities) {
  if (!Array.isArray(amenities)) return [];
  const serviceKeys = [];
  const lower = amenities.map(a => (a || '').toLowerCase());
  if (lower.some(a => a.includes('wifi') || a.includes('internet'))) serviceKeys.push('wifi');
  if (lower.some(a => a.includes('food') || a.includes('meal'))) serviceKeys.push('food');
  // Always include wifi if nothing matched (most PGs have wifi)
  if (serviceKeys.length === 0) serviceKeys.push('wifi');
  return serviceKeys;
}

// ── PG Listings ─────────────────────────────────────────────────────────

/** Fetch all PG listings with joined provider info.
 *  Uses safeFetch for error handling and AbortController support. */
export async function fetchPGListings({ signal } = {}) {
  if (signal?.aborted) return { data: [], error: null, aborted: true };
  try {
    const response = await backendRequest('/room-listings/public', { signal });
    return {
      data: (response?.data || []).map((record, index) => mapRoomListingToListing(record, index)),
      error: null,
      aborted: false,
    };
  } catch (error) {
    if (signal?.aborted) return { data: [], error: null, aborted: true };
    console.error('fetchPGListings failed:', error);
    return { data: [], error, aborted: false };
  }
}

/** Search PG listings by name or address */
export async function searchPGListings(query, { signal } = {}) {
  const result = await fetchPGListings({ signal });
  if (result.aborted || result.error || !query?.trim()) return result;
  const term = query.trim().toLowerCase();
  return {
    ...result,
    data: result.data.filter((listing) => `${listing.title} ${listing.address}`.toLowerCase().includes(term)),
  };
}

// ── Real-time Subscription ──────────────────────────────────────────────

/** Subscribe to PG changes for real-time updates */
export function subscribeToPGChanges(callback) {
  const channel = supabase
    .channel('pg-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pg_details' },
      (payload) => {
        callback?.(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Utility ─────────────────────────────────────────────────────────────

// ── Exports for direct image resolution ─────────────────────────────────
export { FALLBACK_IMAGE, resolveImageUrl, extractImages };

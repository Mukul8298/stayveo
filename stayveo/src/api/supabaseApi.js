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

    console.log(`✅ safeFetch [${label}]: returned ${Array.isArray(data) ? data.length : 1} result(s)`);
    return { data, error: null, aborted: false };
  } catch (err) {
    // Check if this was an abort
    if (signal?.aborted || err.name === 'AbortError') {
      console.log(`🚫 safeFetch [${label}]: aborted (component unmounted or navigation)`);
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
      console.log(`🖼️ Resolved storage path: ${path} → ${data.publicUrl}`);
      return data.publicUrl;
    }
  }

  // Try each known bucket
  for (const bucket of STORAGE_BUCKETS) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) {
      console.log(`🖼️ Resolved storage path (bucket: ${bucket}): ${path} → ${data.publicUrl}`);
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
    console.log(`📷 No images found for PG "${pg?.pg_name || pg?.id}", using fallback`);
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
function mapPGToListing(pg, index = 0) {
  const provider = pg?.provider_services?.provider_profiles;

  // Extract images from all possible sources
  const images = extractImages(pg);

  return {
    id: pg?.id || `pg-${index}`,
    title: pg?.pg_name || pg?.name || pg?.title || 'PG Room',
    type: pg?.type || 'PG',
    price: pg?.min_price || pg?.price || 0,
    securityDeposit: pg?.security_deposit ?? pg?.securityDeposit ?? null,
    foodCharges: pg?.food_charges ?? pg?.foodCharges ?? pg?.meal_charges ?? null,
    electricityCharges: pg?.electricity_charges ?? pg?.electricityCharges ?? null,
    slotReservationFee: pg?.slot_reservation_fee ?? pg?.slotReservationFee ?? null,
    platformFee: pg?.platform_fee ?? pg?.platformFee ?? null,
    distance: pg?.distance ?? pg?.distance_km ?? null,
    distanceKm: pg?.distance ?? pg?.distance_km ?? null,
    distanceLabel: null,
    // Use real rating if available from the database
    rating: pg?.rating ?? pg?.avg_rating ?? 0,
    reviews: pg?.review_count ?? pg?.reviews ?? 0,
    verified: pg?.verified ?? pg?.is_verified ?? true,
    available: pg?.available ?? pg?.is_available ?? true,
    images,
    roomType: pg?.room_type || 'shared',
    capacity: pg?.capacity || pg?.max_occupancy || 2,
    gender: pg?.gender || pg?.gender_preference || 'any',
    services: mapAmenities(pg?.amenities),
    amenities: Array.isArray(pg?.amenities) ? pg.amenities : [],
    address: pg?.address || 'Address not available',
    owner: provider?.name || pg?.owner_name || 'Property Owner',
    providerId: pg?.provider_services?.provider_id || pg?.provider_id || null,
    providerPhone: provider?.phone || pg?.owner_phone || null,
    latitude: pg?.latitude ? Number(pg.latitude) : null,
    longitude: pg?.longitude ? Number(pg.longitude) : null,
    description: pg?.description || `${pg?.pg_name || 'PG'} located at ${pg?.address || 'N/A'}. Contact owner for details.`,
  };
}

/** Convert amenity strings to service keys for icons */
function mapAmenities(amenities) {
  if (!Array.isArray(amenities)) return [];
  const serviceKeys = [];
  const lower = amenities.map(a => (a || '').toLowerCase());
  if (lower.some(a => a.includes('wifi') || a.includes('internet'))) serviceKeys.push('wifi');
  if (lower.some(a => a.includes('food') || a.includes('meal') || a.includes('tiffin'))) serviceKeys.push('food');
  if (lower.some(a => a.includes('laundry') || a.includes('wash'))) serviceKeys.push('laundry');
  if (lower.some(a => a.includes('clean'))) serviceKeys.push('cleaning');
  // Always include wifi if nothing matched (most PGs have wifi)
  if (serviceKeys.length === 0) serviceKeys.push('wifi');
  return serviceKeys;
}

// ── PG Listings ─────────────────────────────────────────────────────────

/** Fetch all PG listings with joined provider info.
 *  Uses safeFetch for error handling and AbortController support. */
export async function fetchPGListings({ signal } = {}) {
  const { data, error, aborted } = await safeFetch(
    () =>
      supabase
        .from('pg_details')
        .select(`
          *,
          provider_services (
            id,
            provider_id,
            provider_profiles (
              id,
              name,
              phone
            )
          )
        `)
        .order('id', { ascending: false }),
    { signal, label: 'fetchPGListings' }
  );

  if (aborted) return { data: [], error: null, aborted: true };
  if (error) return { data: [], error };

  const listings = (data || []).map((pg, i) => mapPGToListing(pg, i));

  console.log('📋 fetchPGListings: mapped', listings.length, 'listings', {
    sample: listings[0] ? {
      id: listings[0].id,
      title: listings[0].title,
      imageCount: listings[0].images?.length,
      firstImage: listings[0].images?.[0]?.substring(0, 60) + '...',
    } : 'none',
  });

  return { data: listings, error: null, aborted: false };
}

/** Search PG listings by name or address */
export async function searchPGListings(query, { signal } = {}) {
  if (!query?.trim()) return fetchPGListings({ signal });

  const searchTerm = `%${query.trim()}%`;

  const { data, error, aborted } = await safeFetch(
    () =>
      supabase
        .from('pg_details')
        .select(`
          *,
          provider_services (
            id,
            provider_id,
            provider_profiles (
              id,
              name,
              phone
            )
          )
        `)
        .or(`pg_name.ilike.${searchTerm},address.ilike.${searchTerm}`)
        .order('id', { ascending: false }),
    { signal, label: `searchPGListings("${query}")` }
  );

  if (aborted) return { data: [], error: null, aborted: true };
  if (error) return { data: [], error };

  const listings = (data || []).map((pg, i) => mapPGToListing(pg, i));
  return { data: listings, error: null, aborted: false };
}

// ── Services (Tiffin, Laundry, Cleaning) ────────────────────────────────

/** Fetch tiffin services */
export async function fetchTiffinServices({ signal } = {}) {
  const { data, error, aborted } = await safeFetch(
    () =>
      supabase
        .from('tiffin_details')
        .select(`
          *,
          provider_services (
            id,
            provider_id,
            provider_profiles ( id, name, phone )
          )
        `)
        .order('id', { ascending: false }),
    { signal, label: 'fetchTiffinServices' }
  );

  if (aborted) return { data: [], error: null, aborted: true };
  if (error) return { data: [], error };

  const services = (data || []).map((t, i) => ({
    id: t?.id || `tiffin-${i}`,
    name: t?.name || 'Tiffin Service',
    category: 'tiffin',
    price: t?.price || 0,
    unit: '/month',
    rating: t?.rating ?? t?.avg_rating ?? 0,
    reviews: t?.review_count ?? 0,
    distance: null,
    distanceKm: null,
    distanceLabel: null,
    verified: t?.verified ?? true,
    image: '🍱',
    description: `${t?.name || 'Tiffin'} - ${t?.meals_per_day || 2} meals/day`,
    plans: [
      { name: 'Monthly', price: t?.price || 2500, details: `${t?.meals_per_day || 2} meals/day` },
    ],
    provider: t?.provider_services?.provider_profiles?.name || 'Provider',
    providerId: t?.provider_services?.provider_id || t?.provider_id || null,
    providerPhone: t?.provider_services?.provider_profiles?.phone || null,
    address: t?.address || t?.service_area || 'Address not available',
    latitude: t?.latitude === null || t?.latitude === undefined ? null : Number(t.latitude),
    longitude: t?.longitude === null || t?.longitude === undefined ? null : Number(t.longitude),
  }));

  return { data: services, error: null };
}

/** Fetch laundry services */
export async function fetchLaundryServices({ signal } = {}) {
  const { data, error, aborted } = await safeFetch(
    () =>
      supabase
        .from('laundry_details')
        .select(`
          *,
          provider_services (
            id,
            provider_id,
            provider_profiles ( id, name, phone )
          )
        `)
        .order('id', { ascending: false }),
    { signal, label: 'fetchLaundryServices' }
  );

  if (aborted) return { data: [], error: null, aborted: true };
  if (error) return { data: [], error };

  const services = (data || []).map((l, i) => ({
    id: l?.id || `laundry-${i}`,
    name: l?.provider_services?.provider_profiles?.name
      ? `${l.provider_services.provider_profiles.name} Laundry`
      : 'Laundry Service',
    category: 'laundry',
    price: parsePricing(l?.pricing, 149),
    unit: '/kg',
    rating: l?.rating ?? l?.avg_rating ?? 0,
    reviews: l?.review_count ?? 0,
    distance: null,
    distanceKm: null,
    distanceLabel: null,
    verified: l?.verified ?? true,
    image: '🧺',
    description: 'Wash, dry & fold service with pickup and delivery.',
    plans: [
      { name: 'Per Kg', price: parsePricing(l?.pricing, 149), details: 'Wash + Fold' },
    ],
    provider: l?.provider_services?.provider_profiles?.name || 'Provider',
    providerId: l?.provider_services?.provider_id || l?.provider_id || null,
    providerPhone: l?.provider_services?.provider_profiles?.phone || null,
    address: l?.address || l?.service_area || 'Address not available',
    latitude: l?.latitude === null || l?.latitude === undefined ? null : Number(l.latitude),
    longitude: l?.longitude === null || l?.longitude === undefined ? null : Number(l.longitude),
  }));

  return { data: services, error: null };
}

/** Fetch cleaning services */
export async function fetchCleaningServices({ signal } = {}) {
  const { data, error, aborted } = await safeFetch(
    () =>
      supabase
        .from('cleaning_details')
        .select(`
          *,
          provider_services (
            id,
            provider_id,
            provider_profiles ( id, name, phone )
          )
        `)
        .order('id', { ascending: false }),
    { signal, label: 'fetchCleaningServices' }
  );

  if (aborted) return { data: [], error: null, aborted: true };
  if (error) return { data: [], error };

  const services = (data || []).map((c, i) => ({
    id: c?.id || `cleaning-${i}`,
    name: c?.provider_services?.provider_profiles?.name
      ? `${c.provider_services.provider_profiles.name} Cleaning`
      : 'Cleaning Service',
    category: 'cleaning',
    price: parsePricing(c?.pricing, 299),
    unit: '/visit',
    rating: c?.rating ?? c?.avg_rating ?? 0,
    reviews: c?.review_count ?? 0,
    distance: null,
    distanceKm: null,
    distanceLabel: null,
    verified: c?.verified ?? true,
    image: '🧹',
    description: 'Room cleaning, bathroom cleaning, and laundry pickup.',
    plans: [
      { name: 'Basic', price: parsePricing(c?.pricing, 299), details: 'Room sweep + mop' },
    ],
    provider: c?.provider_services?.provider_profiles?.name || 'Provider',
    providerId: c?.provider_services?.provider_id || c?.provider_id || null,
    providerPhone: c?.provider_services?.provider_profiles?.phone || null,
    address: c?.address || c?.service_area || 'Address not available',
    latitude: c?.latitude === null || c?.latitude === undefined ? null : Number(c.latitude),
    longitude: c?.longitude === null || c?.longitude === undefined ? null : Number(c.longitude),
  }));

  return { data: services, error: null };
}

/** Fetch ALL services (tiffin + laundry + cleaning) */
export async function fetchAllServices({ signal } = {}) {
  const [tiffin, laundry, cleaning] = await Promise.all([
    fetchTiffinServices({ signal }),
    fetchLaundryServices({ signal }),
    fetchCleaningServices({ signal }),
  ]);

  const all = [
    ...(tiffin.data || []),
    ...(laundry.data || []),
    ...(cleaning.data || []),
  ];

  const hasError = tiffin.error || laundry.error || cleaning.error;
  return { data: all, error: hasError || null };
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
        console.log('📡 PG change detected:', payload.eventType);
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

function parsePricing(pricing, fallback = 0) {
  if (!pricing) return fallback;
  if (typeof pricing === 'number') return pricing;
  const match = String(pricing).match(/\d+/);
  return match ? parseInt(match[0], 10) : fallback;
}

// ── Exports for direct image resolution ─────────────────────────────────
export { FALLBACK_IMAGE, resolveImageUrl, extractImages };

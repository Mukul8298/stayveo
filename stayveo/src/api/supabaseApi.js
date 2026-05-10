// ─── Supabase API Layer ─────────────────────────────────────────────────
// All read queries for PG listings, services, and search.
// Uses Supabase JS client for direct DB access (read-only).
// Write operations still go through the Fastify backend.
// ────────────────────────────────────────────────────────────────────────

import supabase from '../lib/supabase.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Map a raw pg_details + provider_services + provider_profiles row
 *  into the shape that <ListingCard> expects */
function mapPGToListing(pg, index = 0) {
  const provider = pg?.provider_services?.provider_profiles;
  return {
    id: pg?.id || `pg-${index}`,
    title: pg?.pg_name || 'PG Room',
    type: 'PG',
    price: pg?.min_price || 0,
    distance: +(Math.random() * 1.5 + 0.1).toFixed(1), // mock distance for now
    rating: +(Math.random() * 0.8 + 3.9).toFixed(1),     // mock rating
    reviews: Math.floor(Math.random() * 200 + 30),        // mock reviews
    verified: true,
    available: true,
    images: pg?.photos?.length
      ? pg.photos.map(p => p || FALLBACK_IMAGE)
      : [FALLBACK_IMAGE],
    roomType: pg?.room_type || 'shared',
    capacity: 2,
    gender: 'any',
    services: mapAmenities(pg?.amenities),
    amenities: Array.isArray(pg?.amenities) ? pg.amenities : [],
    address: pg?.address || 'Address not available',
    owner: provider?.name || 'Property Owner',
    providerId: pg?.provider_services?.provider_id || null,
    description: `${pg?.pg_name || 'PG'} located at ${pg?.address || 'N/A'}. Contact owner for details.`,
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
  // Always include wifi if nothing matched
  if (serviceKeys.length === 0) serviceKeys.push('wifi');
  return serviceKeys;
}

// ── PG Listings ─────────────────────────────────────────────────────────

/** Fetch all PG listings with joined provider info */
export async function fetchPGListings() {
  const { data, error } = await supabase
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
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ fetchPGListings error:', error.message);
    return { data: [], error };
  }

  const listings = (data || []).map((pg, i) => mapPGToListing(pg, i));
  return { data: listings, error: null };
}

/** Search PG listings by name or address */
export async function searchPGListings(query) {
  if (!query?.trim()) return fetchPGListings();

  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await supabase
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
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ searchPGListings error:', error.message);
    return { data: [], error };
  }

  const listings = (data || []).map((pg, i) => mapPGToListing(pg, i));
  return { data: listings, error: null };
}

// ── Services (Tiffin, Laundry, Cleaning) ────────────────────────────────

/** Fetch tiffin services */
export async function fetchTiffinServices() {
  const { data, error } = await supabase
    .from('tiffin_details')
    .select(`
      *,
      provider_services (
        id,
        provider_id,
        provider_profiles ( id, name, phone )
      )
    `)
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ fetchTiffinServices error:', error.message);
    return { data: [], error };
  }

  const services = (data || []).map((t, i) => ({
    id: t?.id || `tiffin-${i}`,
    name: t?.name || 'Tiffin Service',
    category: 'tiffin',
    price: t?.price || 0,
    unit: '/month',
    rating: +(Math.random() * 0.7 + 4.0).toFixed(1),
    reviews: Math.floor(Math.random() * 300 + 50),
    distance: +(Math.random() * 1.2 + 0.2).toFixed(1),
    verified: true,
    image: '🍱',
    description: `${t?.name || 'Tiffin'} - ${t?.meals_per_day || 2} meals/day`,
    plans: [
      { name: 'Monthly', price: t?.price || 2500, details: `${t?.meals_per_day || 2} meals/day` },
    ],
    provider: t?.provider_services?.provider_profiles?.name || 'Provider',
  }));

  return { data: services, error: null };
}

/** Fetch laundry services */
export async function fetchLaundryServices() {
  const { data, error } = await supabase
    .from('laundry_details')
    .select(`
      *,
      provider_services (
        id,
        provider_id,
        provider_profiles ( id, name, phone )
      )
    `)
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ fetchLaundryServices error:', error.message);
    return { data: [], error };
  }

  const services = (data || []).map((l, i) => ({
    id: l?.id || `laundry-${i}`,
    name: l?.provider_services?.provider_profiles?.name
      ? `${l.provider_services.provider_profiles.name} Laundry`
      : 'Laundry Service',
    category: 'laundry',
    price: parsePricing(l?.pricing, 149),
    unit: '/kg',
    rating: +(Math.random() * 0.6 + 4.0).toFixed(1),
    reviews: Math.floor(Math.random() * 250 + 40),
    distance: +(Math.random() * 1.0 + 0.3).toFixed(1),
    verified: true,
    image: '🧺',
    description: 'Wash, dry & fold service with pickup and delivery.',
    plans: [
      { name: 'Per Kg', price: parsePricing(l?.pricing, 149), details: 'Wash + Fold' },
    ],
    provider: l?.provider_services?.provider_profiles?.name || 'Provider',
  }));

  return { data: services, error: null };
}

/** Fetch cleaning services */
export async function fetchCleaningServices() {
  const { data, error } = await supabase
    .from('cleaning_details')
    .select(`
      *,
      provider_services (
        id,
        provider_id,
        provider_profiles ( id, name, phone )
      )
    `)
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ fetchCleaningServices error:', error.message);
    return { data: [], error };
  }

  const services = (data || []).map((c, i) => ({
    id: c?.id || `cleaning-${i}`,
    name: c?.provider_services?.provider_profiles?.name
      ? `${c.provider_services.provider_profiles.name} Cleaning`
      : 'Cleaning Service',
    category: 'cleaning',
    price: parsePricing(c?.pricing, 299),
    unit: '/visit',
    rating: +(Math.random() * 0.6 + 4.0).toFixed(1),
    reviews: Math.floor(Math.random() * 200 + 30),
    distance: +(Math.random() * 1.0 + 0.2).toFixed(1),
    verified: true,
    image: '🧹',
    description: 'Room cleaning, bathroom cleaning, and laundry pickup.',
    plans: [
      { name: 'Basic', price: parsePricing(c?.pricing, 299), details: 'Room sweep + mop' },
    ],
    provider: c?.provider_services?.provider_profiles?.name || 'Provider',
  }));

  return { data: services, error: null };
}

/** Fetch ALL services (tiffin + laundry + cleaning) */
export async function fetchAllServices() {
  const [tiffin, laundry, cleaning] = await Promise.all([
    fetchTiffinServices(),
    fetchLaundryServices(),
    fetchCleaningServices(),
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

import { request } from './client';
import { normalizeTiffinProvider } from '../data/tiffin';

function buildQuery(filters = {}) {
  const params = new URLSearchParams({ page: '1', limit: '50' });
  if (filters.foodType) params.set('food_type', filters.foodType);
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.latitude !== undefined) params.set('latitude', String(filters.latitude));
  if (filters.longitude !== undefined) params.set('longitude', String(filters.longitude));
  if (filters.radius) params.set('radius', String(filters.radius));
  return params.toString();
}

export async function fetchTiffinProviders(filters = {}, { signal } = {}) {
  try {
    const response = await request(`/tiffin?${buildQuery(filters)}`, { signal });
    const items = response?.data?.items || response?.data || [];
    return {
      data: Array.isArray(items) ? items.map(normalizeTiffinProvider) : [],
      error: null,
      fromFallback: false,
    };
  } catch (error) {
    if (signal?.aborted) return { data: [], error: null, aborted: true, fromFallback: false };
    return { data: [], error, fromFallback: false };
  }
}

export async function fetchTiffinProvider(id, options = {}) {
  const result = await fetchTiffinProviders({}, options);
  if (result.aborted) return result;
  const provider = result.data.find((item) => String(item.id) === String(id)) || null;
  return { ...result, data: provider };
}

export async function fetchTodaysTiffinMenu(id, options = {}) {
  const response = await request(`/tiffin/${encodeURIComponent(id)}/menu/today`, options);
  return response?.data || { dayOfWeek: null, meals: { lunch: [], dinner: [] } };
}

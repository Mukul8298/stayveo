const LOCAL_API_BASES = ['http://localhost:3000/api/v1', 'http://localhost:3000'];
const ENV_API_BASE = import.meta.env.VITE_API_URL;
const isLocalFrontend =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_BASES = [
  ...(isLocalFrontend ? LOCAL_API_BASES : []),
  ENV_API_BASE,
  ...(!isLocalFrontend ? LOCAL_API_BASES : []),
].filter(Boolean);

function normalizeCollege(college) {
  if (!college) return null;
  return {
    ...college,
    latitude: college.latitude === null || college.latitude === undefined ? null : Number(college.latitude),
    longitude: college.longitude === null || college.longitude === undefined ? null : Number(college.longitude),
  };
}

export async function getColleges({ search = '', page = 1, limit = 20, signal } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  let lastError;

  for (const baseUrl of API_BASES) {
    try {
      const res = await fetch(`${baseUrl}/colleges?${params.toString()}`, { signal });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not load colleges');
      }

      return {
        ...json.data,
        items: (json.data?.items || []).map(normalizeCollege),
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Could not load colleges');
}

export async function getCollegeById(id, { signal } = {}) {
  if (!id) throw new Error('College ID is required');

  let lastError;

  for (const baseUrl of API_BASES) {
    try {
      const res = await fetch(`${baseUrl}/colleges/${id}`, { signal });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not load selected college');
      }

      return normalizeCollege(json.data);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Could not load selected college');
}

// ─── API endpoint configuration ─────────────────────────────────────────
// Keep all browser-to-backend URLs in one place so local development and
// forwarded/tunnelled device testing use the same routing rules.
// ────────────────────────────────────────────────────────────────────────

const PRODUCTION_API_ORIGIN = 'https://stayveo.onrender.com';

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().replace(/\/+$/, '');
}

function uniqueUrls(urls) {
  return urls.filter(Boolean).filter((url, index, allUrls) => allUrls.indexOf(url) === index);
}

const configuredApiBase = normalizeBaseUrl(import.meta.env.VITE_API_URL) || `${PRODUCTION_API_ORIGIN}/api/v1`;
const configuredProviderBase = normalizeBaseUrl(import.meta.env.VITE_PROVIDER_URL) || `${PRODUCTION_API_ORIGIN}/api/provider`;

// The Render backend is the production source for all browser API calls.
// The relative fallback remains available for local Vite proxy testing, but
// the proxy itself also defaults to the Render backend.
export const API_BASES = uniqueUrls(
  [configuredApiBase]
);

export const PROVIDER_API_BASES = uniqueUrls(
  [configuredProviderBase]
);

export { normalizeBaseUrl };

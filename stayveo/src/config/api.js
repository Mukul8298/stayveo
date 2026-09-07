// ─── API endpoint configuration ─────────────────────────────────────────
// Keep all browser-to-backend URLs in one place so local development and
// forwarded/tunnelled device testing use the same routing rules.
// ────────────────────────────────────────────────────────────────────────

const LOCAL_API_ORIGIN = 'http://localhost:3000';
const isLocalFrontend =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().replace(/\/+$/, '');
}

function uniqueUrls(urls) {
  return urls.filter(Boolean).filter((url, index, allUrls) => allUrls.indexOf(url) === index);
}

const configuredApiBase = normalizeBaseUrl(import.meta.env.VITE_API_URL);
const configuredProviderBase = normalizeBaseUrl(import.meta.env.VITE_PROVIDER_URL);
const sameOrigin = typeof window !== 'undefined' ? window.location.origin : null;

// On a phone, localhost points to the phone itself and must never be used as
// a fallback. If no backend tunnel is configured, the Vite /api proxy keeps
// same-origin requests working during forwarded-port development.
export const API_BASES = uniqueUrls(
  isLocalFrontend
    ? [`${LOCAL_API_ORIGIN}/api/v1`, configuredApiBase]
    : [configuredApiBase, sameOrigin ? `${sameOrigin}/api/v1` : null]
);

export const PROVIDER_API_BASES = uniqueUrls(
  isLocalFrontend
    ? [`${LOCAL_API_ORIGIN}/api/provider`, configuredProviderBase]
    : [configuredProviderBase, sameOrigin ? `${sameOrigin}/api/provider` : null]
);

export { normalizeBaseUrl };

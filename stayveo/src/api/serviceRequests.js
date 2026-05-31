const LOCAL_API_BASE = 'http://localhost:3000/api/v1';
const ENV_API_BASE = import.meta.env.VITE_API_URL;
const isLocalFrontend =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_BASES = [
  ...(isLocalFrontend ? [LOCAL_API_BASE] : []),
  ENV_API_BASE,
  ...(!isLocalFrontend ? [LOCAL_API_BASE] : []),
].filter(Boolean);

async function request(endpoint, { method = 'GET', body, userId, providerId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  if (providerId) headers['x-provider-id'] = providerId;

  let lastError;

  for (const baseUrl of API_BASES) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Something went wrong');
      return json;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Something went wrong');
}

export function createServiceRequest(userId, data) {
  return request('/service-requests', { method: 'POST', body: data, userId });
}

export function getStudentServiceRequests(userId, { status, page = 1, limit = 30 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return request(`/service-requests/student?${params.toString()}`, { userId });
}

export function getProviderServiceRequests(providerId, { status, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return request(`/service-requests/provider/${providerId}?${params.toString()}`);
}

export function acceptServiceRequest(providerId, requestId, data) {
  return request(`/service-requests/${requestId}/accept`, {
    method: 'PATCH',
    body: data,
    providerId,
  });
}

export function declineServiceRequest(providerId, requestId, reason) {
  return request(`/service-requests/${requestId}/decline`, {
    method: 'PATCH',
    body: { reason },
    providerId,
  });
}

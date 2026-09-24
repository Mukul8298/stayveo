import { request } from './client';

const base = '/tiffin/provider';

// Provider identity comes only from the HttpOnly provider session cookie.
// Keep the argument for component compatibility, but never send it as an
// authority to the backend.
function legacyOwnerOptions(_provider) {
  void _provider;
  return {};
}

export function getTiffinOnboarding() {
  return request(`${base}/onboarding`);
}

export function saveTiffinOnboarding(_provider, step, data) {
  return request(`${base}/onboarding`, {
    method: 'PUT',
    body: { step, data },
  });
}

export function submitTiffinOnboarding() {
  return request(`${base}/onboarding/submit`, {
    method: 'POST',
  });
}

export function createTiffinKycUploadUrl(_provider, data) {
  return request(`${base}/kyc/upload-url`, {
    method: 'POST',
    body: data,
  });
}

export function getTiffinDashboard(provider) {
  return request(`${base}/dashboard`, legacyOwnerOptions(provider));
}

export function getTiffinMealChanges(provider, filter = '') {
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return request(`${base}/meal-changes${params}`, legacyOwnerOptions(provider));
}

export function getTiffinCustomers(provider, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
  return request(`${base}/customers${params.toString() ? `?${params}` : ''}`, legacyOwnerOptions(provider));
}

export function getTiffinCustomer(provider, id) {
  return request(`${base}/customers/${id}`, legacyOwnerOptions(provider));
}

export function createTiffinCustomer(provider, data) {
  return request(`${base}/customers`, {
    method: 'POST',
    body: data,
    ...legacyOwnerOptions(provider),
  });
}

export function getTiffinDeliveries(provider, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
  return request(`${base}/deliveries${params.toString() ? `?${params}` : ''}`, legacyOwnerOptions(provider));
}

export function updateTiffinDelivery(provider, id, delivered = true) {
  return request(`${base}/deliveries/${id}`, {
    method: 'PATCH',
    body: { delivered },
    ...legacyOwnerOptions(provider),
  });
}

export function markAllTiffinDeliveries(provider, ids) {
  return request(`${base}/deliveries/mark-all`, {
    method: 'POST',
    body: { ids },
    ...legacyOwnerOptions(provider),
  });
}

export function getTiffinMenu(provider) {
  return request(`${base}/menu`, legacyOwnerOptions(provider));
}

export function saveTiffinMenu(provider, menus) {
  return request(`${base}/menu`, {
    method: 'PUT',
    body: { menus },
    ...legacyOwnerOptions(provider),
  });
}

export function getTiffinReports(provider) {
  return request(`${base}/reports`, legacyOwnerOptions(provider));
}

export function getTiffinSettings(provider) {
  return request(`${base}/settings`, legacyOwnerOptions(provider));
}

export function updateTiffinSettings(provider, data) {
  return request(`${base}/settings`, {
    method: 'PUT',
    body: data,
    ...legacyOwnerOptions(provider),
  });
}

export function getTiffinBusinessDetails(provider) {
  return request(`${base}/business-details`, legacyOwnerOptions(provider));
}

export function updateTiffinBusinessDetails(provider, data) {
  return request(`${base}/business-details`, {
    method: 'PUT',
    body: data,
    ...legacyOwnerOptions(provider),
  });
}

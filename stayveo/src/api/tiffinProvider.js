import { request } from './client';

const base = '/tiffin/provider';

function ownerOptions(provider) {
  return {
    providerPhone: provider?.phone,
    userId: provider?.userId || provider?.user_id,
  };
}

export function getTiffinOnboarding(provider) {
  return request(`${base}/onboarding`, ownerOptions(provider));
}

export function saveTiffinOnboarding(provider, step, data) {
  return request(`${base}/onboarding`, {
    method: 'PUT',
    body: { step, data },
    ...ownerOptions(provider),
  });
}

export function submitTiffinOnboarding(provider) {
  return request(`${base}/onboarding/submit`, {
    method: 'POST',
    ...ownerOptions(provider),
  });
}

export function createTiffinKycUploadUrl(provider, data) {
  return request(`${base}/kyc/upload-url`, {
    method: 'POST',
    body: data,
    ...ownerOptions(provider),
  });
}

export function getTiffinDashboard(provider) {
  return request(`${base}/dashboard`, ownerOptions(provider));
}

export function getTiffinMealChanges(provider, filter = '') {
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return request(`${base}/meal-changes${params}`, ownerOptions(provider));
}

export function getTiffinCustomers(provider, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
  return request(`${base}/customers${params.toString() ? `?${params}` : ''}`, ownerOptions(provider));
}

export function getTiffinCustomer(provider, id) {
  return request(`${base}/customers/${id}`, ownerOptions(provider));
}

export function createTiffinCustomer(provider, data) {
  return request(`${base}/customers`, {
    method: 'POST',
    body: data,
    ...ownerOptions(provider),
  });
}

export function getTiffinDeliveries(provider, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
  return request(`${base}/deliveries${params.toString() ? `?${params}` : ''}`, ownerOptions(provider));
}

export function updateTiffinDelivery(provider, id, delivered = true) {
  return request(`${base}/deliveries/${id}`, {
    method: 'PATCH',
    body: { delivered },
    ...ownerOptions(provider),
  });
}

export function markAllTiffinDeliveries(provider, ids) {
  return request(`${base}/deliveries/mark-all`, {
    method: 'POST',
    body: { ids },
    ...ownerOptions(provider),
  });
}

export function getTiffinMenu(provider) {
  return request(`${base}/menu`, ownerOptions(provider));
}

export function saveTiffinMenu(provider, menus) {
  return request(`${base}/menu`, {
    method: 'PUT',
    body: { menus },
    ...ownerOptions(provider),
  });
}

export function getTiffinReports(provider) {
  return request(`${base}/reports`, ownerOptions(provider));
}

export function getTiffinSettings(provider) {
  return request(`${base}/settings`, ownerOptions(provider));
}

export function updateTiffinSettings(provider, data) {
  return request(`${base}/settings`, {
    method: 'PUT',
    body: data,
    ...ownerOptions(provider),
  });
}

export function getTiffinBusinessDetails(provider) {
  return request(`${base}/business-details`, ownerOptions(provider));
}

export function updateTiffinBusinessDetails(provider, data) {
  return request(`${base}/business-details`, {
    method: 'PUT',
    body: data,
    ...ownerOptions(provider),
  });
}

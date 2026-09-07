import { request } from './client';

export function getTiffinReservationContext(serviceId, userId, { planId, plan, signal } = {}) {
  const params = new URLSearchParams();
  if (planId) params.set('planId', planId);
  if (plan) params.set('plan', plan);
  return request(`/tiffin/${encodeURIComponent(serviceId)}/reservation${params.toString() ? `?${params}` : ''}`, { userId, signal });
}

export function createTiffinReservation(serviceId, userId, data) {
  return request(`/tiffin/${encodeURIComponent(serviceId)}/reservation`, { method: 'POST', body: data, userId });
}

export function confirmTiffinReservation(reservationId, userId) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/confirm`, { method: 'POST', userId });
}

export function failTiffinPaymentForTest(reservationId, userId) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment/fail`, { method: 'POST', userId });
}

export function getTiffinReservation(reservationId, userId, serviceId) {
  const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}${query}`, { userId });
}

export function getTiffinPayment(serviceId, paymentId, userId) {
  return request(`/tiffin/${encodeURIComponent(serviceId)}/payment/${encodeURIComponent(paymentId)}`, { userId });
}

export function createTiffinPayment(reservationId, userId, data = {}) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment`, { method: 'POST', body: data, userId });
}

export function processTiffinMockPayment(reservationId, userId, data = {}) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment/mock/process`, { method: 'POST', body: data, userId });
}

export function completeTiffinMockPayment(reservationId, userId, data = {}) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment/mock/complete`, { method: 'POST', body: data, userId });
}

export function failTiffinMockPayment(reservationId, userId, data = {}) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment/mock/fail`, { method: 'POST', body: data, userId });
}

export function cancelTiffinMockPayment(reservationId, userId, data = {}) {
  return request(`/tiffin/reservations/${encodeURIComponent(reservationId)}/payment/mock/cancel`, { method: 'POST', body: data, userId });
}

export function getMyTiffinReservations(userId) {
  return request('/tiffin/my-reservations', { userId });
}

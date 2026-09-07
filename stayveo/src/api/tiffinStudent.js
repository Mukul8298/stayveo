import { request } from './client';

export function getMyTiffinSpace(userId, signal) {
  return request('/tiffin/my-space', { userId, signal });
}

export function skipTiffinMeal(subscriptionId, userId, meal, date) {
  return request(`/tiffin/my-subscriptions/${encodeURIComponent(subscriptionId)}/skip-meal`, {
    method: 'POST',
    body: { meal, date },
    userId,
  });
}

export function pauseTiffinSubscription(subscriptionId, userId, startDate, endDate) {
  return request(`/tiffin/my-subscriptions/${encodeURIComponent(subscriptionId)}/pause`, {
    method: 'POST',
    body: { startDate, endDate },
    userId,
  });
}

export function resumeTiffinSubscription(subscriptionId, userId) {
  return request(`/tiffin/my-subscriptions/${encodeURIComponent(subscriptionId)}/resume`, {
    method: 'POST',
    userId,
  });
}

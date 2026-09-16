// ─── Notifications API Client ───────────────────────────────────────────
// Central API functions for the notification system.
// All calls target /api/v1/notifications with x-user-id header.
// ────────────────────────────────────────────────────────────────────────

import { request } from './client.js';

/**
 * Fetch notifications for the current user.
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} options
 */
export function getNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const endpoint = unreadOnly ? '/notifications/unread' : '/notifications';
  return request(`${endpoint}?limit=${limit}`, { method: 'GET', userId });
}

/**
 * Get the count of unread notifications.
 * @param {string} userId
 */
export function getUnreadCount(userId) {
  return request('/notifications/unread/count', { method: 'GET', userId });
}

/**
 * Mark a single notification as read.
 * @param {string} userId
 * @param {string} notificationId
 */
export function markNotificationRead(userId, notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: 'PATCH', userId });
}

/**
 * Mark all notifications as read for the current user.
 * @param {string} userId
 */
export function markAllNotificationsRead(userId) {
  return request('/notifications/read-all', { method: 'PATCH', userId });
}

/**
 * Delete a single notification.
 * @param {string} userId
 * @param {string} notificationId
 */
export function deleteNotification(userId, notificationId) {
  return request(`/notifications/${notificationId}`, { method: 'DELETE', userId });
}

/**
 * Get notification preferences for the current user.
 * @param {string} userId
 */
export function getNotificationPreferences(userId) {
  return request('/notifications/preferences', { method: 'GET', userId });
}

/**
 * Update notification preferences.
 * @param {string} userId
 * @param {Array<{ channel: string, enabled: boolean }>} preferences
 */
export function updateNotificationPreferences(userId, preferences) {
  return request('/notifications/preferences', {
    method: 'PUT',
    body: { preferences },
    userId,
  });
}

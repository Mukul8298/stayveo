import { notificationRepository } from './notification.repository.js';
import { notificationDispatcher } from './notification.dispatcher.js';
import { notificationFactory } from './notification.factory.js';
import { notificationPreferenceService } from './notification.preference.service.js';
import { notificationRetryService } from './notification.retry.service.js';
import type { NotificationMessage } from './notification.types.js';

export const notificationService = {
  async createAndDispatch(message: NotificationMessage) {
    if (!(await notificationPreferenceService.allowsInApp(message.userId))) return null;

    const notification = await notificationRepository.create(message);
    const result = await notificationDispatcher.dispatch('IN_APP', message);
    await notificationRepository.log(notification.id, result.delivered ? 'info' : 'error', result.delivered ? 'In-app notification created' : 'In-app delivery unavailable', result.providerResponse);
    return notification;
  },

  async createFromTemplate(userId: string, key: string, audience: string, payload: Record<string, unknown>, eventType: NotificationMessage['eventType']) {
    return notificationService.createAndDispatch(await notificationFactory.createFromTemplate(userId, key, audience, payload, eventType));
  },

  async scheduleRetry(notificationId: string, attemptCount: number, error: Error, payload?: Record<string, unknown>) {
    await notificationRetryService.schedule(notificationId, attemptCount, error, payload);
  },

  list(userId: string, unreadOnly = false, limit = 50) { return notificationRepository.findForUser(userId, unreadOnly, limit); },
  async get(userId: string, id: string) {
    const notification = await notificationRepository.findByIdForUser(id, userId);
    if (!notification) throw { statusCode: 404, message: 'Notification not found' };
    return notification;
  },
  markRead(userId: string, id: string) { return notificationRepository.markRead(id, userId); },
  markAllRead(userId: string) { return notificationRepository.markAllRead(userId); },
  delete(userId: string, id: string) { return notificationRepository.delete(id, userId); },
  countUnread(userId: string) { return notificationRepository.countUnread(userId); },
  preferences(userId: string) { return notificationRepository.getPreferences(userId); },
  updatePreferences(userId: string, preferences: Array<{ channel: string; enabled: boolean }>) { return notificationRepository.upsertPreferences(userId, preferences); },
};

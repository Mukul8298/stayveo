import { notificationRepository } from './notification.repository.js';

export class NotificationPreferenceService {
  get(userId: string) { return notificationRepository.getPreferences(userId); }
  update(userId: string, preferences: Array<{ channel: string; enabled: boolean }>) { return notificationRepository.upsertPreferences(userId, preferences); }
  async allowsInApp(userId: string) {
    const preference = (await this.get(userId)).find((item) => item.channel === 'IN_APP');
    return preference?.enabled !== false;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();

import { notificationRepository } from './notification.repository.js';

export class NotificationReadService {
  markRead(userId: string, id: string) { return notificationRepository.markRead(id, userId); }
  markAllRead(userId: string) { return notificationRepository.markAllRead(userId); }
}

export const notificationReadService = new NotificationReadService();

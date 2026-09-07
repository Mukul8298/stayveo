import { notificationRepository } from './notification.repository.js';

export class NotificationCountService {
  unread(userId: string) { return notificationRepository.countUnread(userId); }
}

export const notificationCountService = new NotificationCountService();

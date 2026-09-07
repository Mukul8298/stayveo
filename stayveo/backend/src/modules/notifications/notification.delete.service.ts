import { notificationRepository } from './notification.repository.js';

export class NotificationDeleteService {
  delete(userId: string, id: string) { return notificationRepository.delete(id, userId); }
}

export const notificationDeleteService = new NotificationDeleteService();

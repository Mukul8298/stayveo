import { MAX_NOTIFICATION_RETRIES, RETRY_BASE_DELAY_MS } from './notification.constants.js';
import { notificationRepository } from './notification.repository.js';

export class NotificationRetryService {
  async schedule(notificationId: string, attemptCount: number, error: Error, payload?: Record<string, unknown>) {
    if (attemptCount >= MAX_NOTIFICATION_RETRIES) return notificationRepository.createDeadLetter(notificationId, error.message, payload);
    return notificationRepository.createRetry(notificationId, attemptCount + 1, new Date(Date.now() + RETRY_BASE_DELAY_MS * (2 ** attemptCount)), error.message);
  }
}

export const notificationRetryService = new NotificationRetryService();

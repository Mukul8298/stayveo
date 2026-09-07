import { notificationTemplateService } from './notification.template.service.js';
import type { NotificationEventType, NotificationMessage } from './notification.types.js';

export class NotificationFactory {
  async createFromTemplate(userId: string, key: string, audience: string, payload: Record<string, unknown>, eventType: NotificationEventType): Promise<NotificationMessage> {
    const rendered = await notificationTemplateService.render(key, audience, payload);
    return { userId, title: rendered.title, message: rendered.message, eventType, reservationId: typeof payload.reservationId === 'string' ? payload.reservationId : undefined, templateId: rendered.templateId, payload };
  }
}

export const notificationFactory = new NotificationFactory();

import { notificationEventHandler } from './notification.event-handler.js';
import type { NotificationEvent } from './notification.types.js';

/** In-process queue adapter; replaceable with a durable queue without touching domain modules. */
export class NotificationQueue {
  enqueue(event: NotificationEvent) { queueMicrotask(() => { void notificationEventHandler.handle(event); }); }
}

export const notificationQueue = new NotificationQueue();

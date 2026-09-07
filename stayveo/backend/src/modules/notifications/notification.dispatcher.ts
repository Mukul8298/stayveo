import { IN_APP_CHANNEL } from './notification.constants.js';
import type { NotificationChannelAdapter, NotificationMessage } from './notification.types.js';

const inAppAdapter: NotificationChannelAdapter = {
  channel: IN_APP_CHANNEL,
  async send() { return { delivered: true, providerResponse: { persisted: true } }; },
};

/** Channel adapters are intentionally pluggable; only in-app delivery is enabled today. */
export class NotificationDispatcher {
  private readonly adapters = new Map<string, NotificationChannelAdapter>([[IN_APP_CHANNEL, inAppAdapter]]);

  register(adapter: NotificationChannelAdapter) { this.adapters.set(adapter.channel, adapter); }
  async dispatch(channel: string, message: NotificationMessage) {
    const adapter = this.adapters.get(channel);
    if (!adapter) return { delivered: false, providerResponse: { reason: 'Channel adapter not configured' } };
    return adapter.send(message);
  }
}

export const notificationDispatcher = new NotificationDispatcher();

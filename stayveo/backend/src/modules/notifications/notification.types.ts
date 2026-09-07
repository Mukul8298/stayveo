export const NOTIFICATION_EVENTS = [
  'BOOKING_INITIATED', 'RESERVATION_CREATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED',
  'BOOKING_CONFIRMED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'RESERVATION_EXPIRED',
  'REFUND_INITIATED', 'REFUND_COMPLETED', 'MOVE_IN_REMINDER', 'MOVE_OUT_REMINDER',
  'INVENTORY_FULL', 'LOW_INVENTORY', 'PROVIDER_VERIFICATION', 'ADMIN_NOTIFICATION', 'SYSTEM_NOTIFICATION',
] as const;

export const NOTIFICATION_CHANNELS = ['IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP'] as const;
export const NOTIFICATION_STATUSES = ['CREATED', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RETRY', 'EXPIRED'] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationEvent {
  type: NotificationEventType;
  userId?: string;
  providerId?: string;
  bookingId?: string;
  reservationId?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationMessage {
  userId: string;
  title: string;
  message: string;
  eventType: NotificationEventType;
  reservationId?: string;
  templateId?: string;
  payload: Record<string, unknown>;
}

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<{ delivered: boolean; providerResponse?: Record<string, unknown> }>;
}

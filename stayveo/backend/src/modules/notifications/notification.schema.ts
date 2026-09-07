import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from './notification.types.js';

export const notificationListSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) });
export const notificationPreferenceSchema = z.object({
  preferences: z.array(z.object({ channel: z.enum(NOTIFICATION_CHANNELS), enabled: z.boolean() })).min(1),
});
export const notificationTestSchema = z.object({ title: z.string().min(1).max(200).default('StayVeo test'), message: z.string().min(1).max(2000).default('Your notification setup is working.') });

export type NotificationListInput = z.infer<typeof notificationListSchema>;
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type NotificationTestInput = z.infer<typeof notificationTestSchema>;

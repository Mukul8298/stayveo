import { Prisma } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import type { NotificationMessage } from './notification.types.js';

const json = (value: Record<string, unknown> | undefined) => value as Prisma.InputJsonValue | undefined;

export const notificationRepository = {
  create(message: NotificationMessage) {
    return prisma.notification.create({
      data: {
        userId: message.userId, title: message.title, message: message.message, type: 'reservation',
        eventType: message.eventType, channel: 'IN_APP', status: 'SENT', isRead: false,
        reservationId: message.reservationId, templateId: message.templateId, payload: json(message.payload),
      },
    });
  },
  findForUser(userId: string, unreadOnly = false, limit = 50) {
    return prisma.notification.findMany({ where: { userId, ...(unreadOnly ? { isRead: false } : {}) }, orderBy: { createdAt: 'desc' }, take: limit });
  },
  findByIdForUser(id: string, userId: string) { return prisma.notification.findFirst({ where: { id, userId } }); },
  markRead(id: string, userId: string) { return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, status: 'READ' } }); },
  markAllRead(userId: string) { return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, status: 'READ' } }); },
  delete(id: string, userId: string) { return prisma.notification.deleteMany({ where: { id, userId } }); },
  countUnread(userId: string) { return prisma.notification.count({ where: { userId, isRead: false } }); },
  getPreferences(userId: string) { return prisma.notificationPreference.findMany({ where: { userId }, orderBy: { channel: 'asc' } }); },
  async upsertPreferences(userId: string, preferences: Array<{ channel: string; enabled: boolean }>) {
    return prisma.$transaction(preferences.map((preference) => prisma.notificationPreference.upsert({
      where: { userId_channel: { userId, channel: preference.channel } },
      create: { userId, ...preference }, update: { enabled: preference.enabled },
    })));
  },
  getTemplate(key: string, audience: string) { return prisma.notificationTemplate.findFirst({ where: { key, audience, isActive: true } }); },
  log(notificationId: string, level: string, message: string, metadata?: Record<string, unknown>) {
    return prisma.notificationLog.create({ data: { notificationId, level, message, metadata: json(metadata) } });
  },
  createRetry(notificationId: string, attemptCount: number, nextAttemptAt: Date, lastError: string) {
    return prisma.notificationRetry.upsert({ where: { notificationId }, create: { notificationId, attemptCount, nextAttemptAt, lastError }, update: { attemptCount, nextAttemptAt, lastError } });
  },
  createDeadLetter(notificationId: string, reason: string, payload?: Record<string, unknown>) {
    return prisma.notificationDeadLetter.upsert({ where: { notificationId }, create: { notificationId, reason, payload: json(payload) }, update: { reason, payload: json(payload) } });
  },
};

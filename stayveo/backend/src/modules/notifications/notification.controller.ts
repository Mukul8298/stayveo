import type { FastifyReply, FastifyRequest } from 'fastify';
import { USER_ID_HEADER } from '../../common/constants.js';
import { sendCreated, sendSuccess } from '../../common/utils/response.js';
import { notificationService } from './notification.service.js';
import { notificationListSchema, notificationPreferenceSchema, notificationTestSchema } from './notification.schema.js';

const userIdFor = (request: FastifyRequest) => {
  const userId = request.headers[USER_ID_HEADER] as string | undefined;
  if (!userId) throw { statusCode: 401, message: 'User ID required' };
  return userId;
};

export const notificationController = {
  async list(request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) { const input = notificationListSchema.parse(request.query); return sendSuccess(reply, await notificationService.list(userIdFor(request), false, input.limit)); },
  async unread(request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) { const input = notificationListSchema.parse(request.query); return sendSuccess(reply, await notificationService.list(userIdFor(request), true, input.limit)); },
  async count(request: FastifyRequest, reply: FastifyReply) { return sendSuccess(reply, { count: await notificationService.countUnread(userIdFor(request)) }); },
  async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) { return sendSuccess(reply, await notificationService.get(userIdFor(request), request.params.id)); },
  async read(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) { await notificationService.markRead(userIdFor(request), request.params.id); return sendSuccess(reply, null, 'Notification marked as read'); },
  async readAll(request: FastifyRequest, reply: FastifyReply) { const result = await notificationService.markAllRead(userIdFor(request)); return sendSuccess(reply, { count: result.count }, 'Notifications marked as read'); },
  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) { await notificationService.delete(userIdFor(request), request.params.id); return sendSuccess(reply, null, 'Notification deleted'); },
  async preferences(request: FastifyRequest, reply: FastifyReply) { return sendSuccess(reply, await notificationService.preferences(userIdFor(request))); },
  async updatePreferences(request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) { const input = notificationPreferenceSchema.parse(request.body); return sendSuccess(reply, await notificationService.updatePreferences(userIdFor(request), input.preferences)); },
  async test(request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) { const input = notificationTestSchema.parse(request.body); const notification = await notificationService.createAndDispatch({ userId: userIdFor(request), title: input.title, message: input.message, eventType: 'SYSTEM_NOTIFICATION', payload: { message: input.message } }); return sendCreated(reply, notification, 'Test notification created'); },
};

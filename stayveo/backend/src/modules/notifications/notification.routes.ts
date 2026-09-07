import type { FastifyInstance } from 'fastify';
import { notificationController } from './notification.controller.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', notificationController.list);
  fastify.get('/unread', notificationController.unread);
  fastify.get('/unread/count', notificationController.count);
  fastify.patch('/read-all', notificationController.readAll);
  fastify.get('/preferences', notificationController.preferences);
  fastify.put('/preferences', notificationController.updatePreferences);
  fastify.post('/test', notificationController.test);
  fastify.get('/:id', notificationController.get);
  fastify.patch('/:id/read', notificationController.read);
  fastify.delete('/:id', notificationController.remove);
}

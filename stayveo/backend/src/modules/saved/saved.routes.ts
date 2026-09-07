import { FastifyInstance } from 'fastify';
import { savedController } from './saved.controller.js';

export default async function savedRoutes(fastify: FastifyInstance) {
  fastify.get('/', savedController.list);
  fastify.get('/ids', savedController.ids);
  fastify.post('/:roomId', savedController.save);
  fastify.delete('/:roomId', savedController.remove);
}

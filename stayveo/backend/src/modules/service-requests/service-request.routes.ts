import { FastifyInstance } from 'fastify';
import { serviceRequestController } from './service-request.controller.js';

export default async function serviceRequestRoutes(fastify: FastifyInstance) {
  fastify.post('/', serviceRequestController.create);
  fastify.get('/student', serviceRequestController.listStudent);
  fastify.get('/provider/:providerId', serviceRequestController.listProvider);
  fastify.patch('/:id/accept', serviceRequestController.accept);
  fastify.patch('/:id/decline', serviceRequestController.decline);
}

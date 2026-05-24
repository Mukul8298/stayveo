import { FastifyInstance } from 'fastify';
import { collegeController } from './college.controller.js';

export default async function collegeRoutes(fastify: FastifyInstance) {
  fastify.get('/', collegeController.list);
  fastify.get('/:id', collegeController.getById);
}

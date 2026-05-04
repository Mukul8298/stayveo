// ─── Fastify Prisma Plugin ──────────────────────────────────────────────
// Decorates the Fastify instance with a shared Prisma client.
// Handles graceful shutdown of the DB connection.
// ────────────────────────────────────────────────────────────────────────

import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import prisma from '../common/db/prisma.js';

async function prismaPlugin(fastify: FastifyInstance) {
  // Decorate the fastify instance so every route can access `fastify.prisma`
  fastify.decorate('prisma', prisma);

  // Gracefully disconnect on server shutdown
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Prisma client disconnected');
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});

// ─── Type augmentation ──────────────────────────────────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

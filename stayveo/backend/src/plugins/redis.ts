import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(fastify: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl && process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL must be configured in production');
  }

  const redis = new Redis(redisUrl || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => {
    fastify.log.info('Redis connected');
  });

  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis error');
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    try {
      await redis.quit();
    } catch (error) {
      fastify.log.warn({ err: error }, 'Redis graceful shutdown failed; disconnecting');
      redis.disconnect();
    }
  });
}

export default fp(redisPlugin, { name: 'redis' });

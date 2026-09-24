import type Redis from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';

export const PROVIDER_DASHBOARD_CACHE_TTL_SECONDS = 120;

export function pgProviderDashboardKey(providerId: string) {
  return `provider:dashboard:pg:${providerId}`;
}

export function tiffinProviderDashboardKey(providerId: string) {
  return `provider:dashboard:tiffin:${providerId}`;
}

export async function readProviderDashboardCache<T>(redis: Redis, key: string, logger: FastifyBaseLogger) {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ err: error, key }, 'Provider dashboard cache read failed');
    return null;
  }
}

export async function writeProviderDashboardCache(
  redis: Redis,
  key: string,
  value: unknown,
  logger: FastifyBaseLogger
) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', PROVIDER_DASHBOARD_CACHE_TTL_SECONDS);
  } catch (error) {
    logger.warn({ err: error, key }, 'Provider dashboard cache write failed');
  }
}

export async function invalidateProviderDashboardCache(
  redis: Redis,
  key: string,
  logger: FastifyBaseLogger
) {
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn({ err: error, key }, 'Provider dashboard cache invalidation failed');
  }
}

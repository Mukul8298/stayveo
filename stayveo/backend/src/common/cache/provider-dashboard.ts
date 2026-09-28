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
    if (!raw) {
      logger.debug?.({ cacheKey: key }, 'Provider dashboard cache miss');
      return null;
    }
    const value = JSON.parse(raw) as T;
    logger.debug?.({ cacheKey: key }, 'Provider dashboard cache hit');
    return value;
  } catch (error) {
    logger.warn({ err: error, cacheKey: key }, 'Provider dashboard cache read failed');
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
    const serialized = JSON.stringify(value);
    logger.debug?.(
      { cacheKey: key, ttlSeconds: PROVIDER_DASHBOARD_CACHE_TTL_SECONDS },
      'Writing provider dashboard cache'
    );
    const result = await redis.set(key, serialized, 'EX', PROVIDER_DASHBOARD_CACHE_TTL_SECONDS);
    logger.debug?.(
      { cacheKey: key, ttlSeconds: PROVIDER_DASHBOARD_CACHE_TTL_SECONDS, redisResult: result },
      'Provider dashboard cache written'
    );
  } catch (error) {
    logger.warn({ err: error, cacheKey: key }, 'Provider dashboard cache write failed');
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
    logger.warn({ err: error, cacheKey: key }, 'Provider dashboard cache invalidation failed');
  }
}

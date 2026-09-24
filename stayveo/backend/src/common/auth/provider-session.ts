import crypto from 'node:crypto';
import type Redis from 'ioredis';

export const PROVIDER_SESSION_COOKIE_NAME = 'stayveo_provider_session';
export const PROVIDER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type ProviderType = 'PG' | 'TIFFIN';

export interface ProviderSessionData {
  userId: string;
  providerId: string | null;
  role: string;
  providerType: ProviderType;
  createdAt: number;
  lastActivityAt: number;
}

const createProviderSessionScript = `
  local previousSessionId = redis.call('GET', KEYS[1])
  if previousSessionId and previousSessionId ~= ARGV[1] then
    redis.call('DEL', 'provider:session:' .. previousSessionId)
  end
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
  return previousSessionId
`;

const deleteProviderSessionScript = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    redis.call('DEL', KEYS[1])
  end
  redis.call('DEL', KEYS[2])
  return 1
`;

const touchProviderSessionScript = `
  if redis.call('EXISTS', KEYS[1]) == 0 then
    return 0
  end
  redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL')
  return 1
`;

function providerSessionKey(sessionId: string) {
  return `provider:session:${sessionId}`;
}

function providerUserSessionKey(userId: string) {
  return `provider:user_session:${userId}`;
}

function isProviderSessionData(value: unknown): value is ProviderSessionData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.userId === 'string' &&
    (typeof data.providerId === 'string' || data.providerId === null) &&
    typeof data.role === 'string' &&
    (data.providerType === 'PG' || data.providerType === 'TIFFIN') &&
    typeof data.createdAt === 'number' &&
    typeof data.lastActivityAt === 'number'
  );
}

function validSessionId(sessionId: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(sessionId);
}

/** Create or replace the single active provider session for an account. */
export async function createProviderSession(
  redis: Redis,
  userId: string,
  role: string,
  providerType: ProviderType,
  providerId: string | null = null,
) {
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const data: ProviderSessionData = {
    userId,
    providerId,
    role,
    providerType,
    createdAt: now,
    lastActivityAt: now,
  };

  await redis.eval(
    createProviderSessionScript,
    2,
    providerUserSessionKey(userId),
    providerSessionKey(sessionId),
    sessionId,
    JSON.stringify(data),
    String(PROVIDER_SESSION_TTL_SECONDS)
  );

  return sessionId;
}

/** Read a provider session and ensure it is still the account's current session. */
export async function getProviderSession(redis: Redis, sessionId: string) {
  if (!validSessionId(sessionId)) return null;

  const raw = await redis.get(providerSessionKey(sessionId));
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isProviderSessionData(parsed)) {
      await redis.del(providerSessionKey(sessionId));
      return null;
    }

    const currentSessionId = await redis.get(providerUserSessionKey(parsed.userId));
    if (currentSessionId !== sessionId) return null;
    return parsed;
  } catch {
    await redis.del(providerSessionKey(sessionId));
    return null;
  }
}

/** Update activity without extending the fixed 30-day TTL. */
export async function touchProviderSession(
  redis: Redis,
  sessionId: string,
  session: ProviderSessionData
) {
  const updated: ProviderSessionData = { ...session, lastActivityAt: Date.now() };
  const didUpdate = await redis.eval(
    touchProviderSessionScript,
    1,
    providerSessionKey(sessionId),
    JSON.stringify(updated)
  );
  return didUpdate === 1 ? updated : null;
}

/** Delete a provider session without deleting a newer replacement. */
export async function deleteProviderSession(
  redis: Redis,
  sessionId: string,
  userId?: string
) {
  if (!validSessionId(sessionId)) return;

  const resolvedUserId = userId || await readProviderSessionUserId(redis, sessionId);
  if (!resolvedUserId) {
    await redis.del(providerSessionKey(sessionId));
    return;
  }

  await redis.eval(
    deleteProviderSessionScript,
    2,
    providerUserSessionKey(resolvedUserId),
    providerSessionKey(sessionId),
    sessionId
  );
}

async function readProviderSessionUserId(redis: Redis, sessionId: string) {
  const raw = await redis.get(providerSessionKey(sessionId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProviderSessionData(parsed) ? parsed.userId : null;
  } catch {
    return null;
  }
}

export function providerSessionCookieOptions(isProduction = process.env.NODE_ENV === 'production') {
  const configuredSameSite = (process.env.PROVIDER_SESSION_SAME_SITE || process.env.SESSION_SAME_SITE)?.toLowerCase();
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : isProduction
      ? 'none'
      : 'lax';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: PROVIDER_SESSION_TTL_SECONDS,
    path: '/',
  } as const;
}

export function clearProviderSessionCookie(reply: { clearCookie: (name: string, options: ReturnType<typeof providerSessionCookieOptions>) => unknown }) {
  reply.clearCookie(PROVIDER_SESSION_COOKIE_NAME, providerSessionCookieOptions());
}

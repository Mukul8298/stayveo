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
  -- Migrate the old single-session pointer, if present, without revoking it.
  local legacySessionId = redis.call('GET', KEYS[3])
  if legacySessionId and legacySessionId ~= ARGV[1] then
    if redis.call('EXISTS', 'provider:session:' .. legacySessionId) == 1 then
      redis.call('SADD', KEYS[1], legacySessionId)
    end
  end

  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  redis.call('SADD', KEYS[1], ARGV[1])
  redis.call('DEL', KEYS[3])

  -- Bound cleanup to one SSCAN batch so expired session IDs do not grow the
  -- account set indefinitely, without scanning the full set on every request.
  local scan = redis.call('SSCAN', KEYS[1], '0', 'COUNT', '100')
  for _, member in ipairs(scan[2]) do
    if redis.call('EXISTS', 'provider:session:' .. member) == 0 then
      redis.call('SREM', KEYS[1], member)
    end
  end
  return 1
`;

const deleteProviderSessionScript = `
  redis.call('SREM', KEYS[1], ARGV[1])
  redis.call('DEL', KEYS[2])
  if redis.call('GET', KEYS[3]) == ARGV[1] then
    redis.call('DEL', KEYS[3])
  end
  return 1
`;

const touchProviderSessionScript = `
  if redis.call('EXISTS', KEYS[1]) == 0 then
    return 0
  end
  redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL')
  return 1
`;

const invalidateAllProviderSessionsScript = `
  local members = redis.call('SMEMBERS', KEYS[1])
  for _, member in ipairs(members) do
    redis.call('DEL', 'provider:session:' .. member)
  end
  local legacy = redis.call('GET', KEYS[2])
  if legacy then
    redis.call('DEL', 'provider:session:' .. legacy)
  end
  redis.call('DEL', KEYS[1])
  redis.call('DEL', KEYS[2])
  return #members
`;

function providerSessionKey(sessionId: string) {
  return `provider:session:${sessionId}`;
}

function providerUserSessionKey(userId: string) {
  return `provider:user_sessions:${userId}`;
}

function legacyProviderUserSessionKey(userId: string) {
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

/** Create an additional provider session without revoking existing sessions. */
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
    3,
    providerUserSessionKey(userId),
    providerSessionKey(sessionId),
    legacyProviderUserSessionKey(userId),
    sessionId,
    JSON.stringify(data),
    String(PROVIDER_SESSION_TTL_SECONDS)
  );

  return sessionId;
}

/** Read and validate an individual provider session. */
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

/** Delete only the specified provider session and its set membership. */
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
    3,
    providerUserSessionKey(resolvedUserId),
    providerSessionKey(sessionId),
    legacyProviderUserSessionKey(resolvedUserId),
    sessionId
  );
}

/** Invalidate all tracked provider sessions only for an explicit password reset. */
export async function invalidateAllProviderSessions(redis: Redis, userId: string) {
  await redis.eval(
    invalidateAllProviderSessionsScript,
    2,
    providerUserSessionKey(userId),
    legacyProviderUserSessionKey(userId)
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

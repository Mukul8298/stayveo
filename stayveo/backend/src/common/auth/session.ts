import crypto from 'node:crypto';
import type Redis from 'ioredis';

export const SESSION_COOKIE_NAME = 'stayveo_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const PROFILE_SETUP_COOKIE_NAME = 'stayveo_profile_setup';
const PROFILE_SETUP_TTL_SECONDS = 15 * 60;

export interface SessionData {
  userId: string;
  role: string;
  createdAt: number;
  lastSeenAt: number;
}

const createSessionScript = `
  local previousSessionId = redis.call('GET', KEYS[1])
  if previousSessionId and previousSessionId ~= ARGV[1] then
    redis.call('DEL', 'session:' .. previousSessionId)
  end
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
  return previousSessionId
`;

const deleteSessionScript = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    redis.call('DEL', KEYS[1])
  end
  redis.call('DEL', KEYS[2])
  return 1
`;

const touchSessionScript = `
  if redis.call('EXISTS', KEYS[1]) == 0 then
    return 0
  end
  redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL')
  return 1
`;

function sessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function userSessionKey(userId: string) {
  return `user_session:${userId}`;
}

function isSessionData(value: unknown): value is SessionData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.userId === 'string' &&
    typeof data.role === 'string' &&
    typeof data.createdAt === 'number' &&
    typeof data.lastSeenAt === 'number'
  );
}

function secretKey() {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('SESSION_SECRET or JWT_SECRET must be configured');
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Create a short-lived encrypted handoff for profile completion. It is not an
 * authenticated session and cannot be used by protected route middleware.
 */
export function createProfileSetupToken(userId: string, role: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const payload = Buffer.from(JSON.stringify({
    userId,
    role,
    expiresAt: Date.now() + PROFILE_SETUP_TTL_SECONDS * 1000,
  }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function readProfileSetupToken(token: string) {
  try {
    if (!token || token.length > 512) return null;
    const [ivValue, authTagValue, encryptedValue] = token.split('.');
    if (!ivValue || !authTagValue || !encryptedValue) return null;

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      secretKey(),
      Buffer.from(ivValue, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]);
    const payload: unknown = JSON.parse(decrypted.toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;

    const data = payload as Record<string, unknown>;
    if (
      typeof data.userId !== 'string' ||
      typeof data.role !== 'string' ||
      typeof data.expiresAt !== 'number' ||
      data.expiresAt <= Date.now()
    ) return null;

    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}

/** Create or replace the single active session for a user atomically. */
export async function createSession(redis: Redis, userId: string, role: string) {
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const data: SessionData = {
    userId,
    role,
    createdAt: now,
    lastSeenAt: now,
  };

  await redis.eval(
    createSessionScript,
    2,
    userSessionKey(userId),
    sessionKey(sessionId),
    sessionId,
    JSON.stringify(data),
    String(SESSION_TTL_SECONDS)
  );

  return sessionId;
}

/** Read a session and ensure it is still the user's current session. */
export async function getSession(redis: Redis, sessionId: string): Promise<SessionData | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(sessionId)) return null;

  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSessionData(parsed)) {
      await redis.del(sessionKey(sessionId));
      return null;
    }
    const mappedSessionId = await redis.get(userSessionKey(parsed.userId));
    if (mappedSessionId !== sessionId) return null;
    return parsed;
  } catch {
    await redis.del(sessionKey(sessionId));
    return null;
  }
}

/** Update activity for a known session ID without changing its TTL. */
export async function touchSessionById(redis: Redis, sessionId: string, session: SessionData) {
  const updated: SessionData = { ...session, lastSeenAt: Date.now() };
  const didUpdate = await redis.eval(
    touchSessionScript,
    1,
    sessionKey(sessionId),
    JSON.stringify(updated)
  );
  return didUpdate === 1 ? updated : null;
}

/** Delete a session and its user mapping, preserving a newer replacement. */
export async function deleteSession(redis: Redis, sessionId: string, userId?: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(sessionId)) return;

  const resolvedUserId = userId || (await readSessionUserId(redis, sessionId));
  if (!resolvedUserId) {
    await redis.del(sessionKey(sessionId));
    return;
  }

  await redis.eval(
    deleteSessionScript,
    2,
    userSessionKey(resolvedUserId),
    sessionKey(sessionId),
    sessionId
  );
}

async function readSessionUserId(redis: Redis, sessionId: string) {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return isSessionData(data) ? data.userId : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(isProduction = process.env.NODE_ENV === 'production') {
  const configuredSameSite = process.env.SESSION_SAME_SITE?.toLowerCase();
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : isProduction
      ? 'none'
      : 'lax';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  } as const;
}

export function profileSetupCookieOptions(isProduction = process.env.NODE_ENV === 'production') {
  return {
    ...sessionCookieOptions(isProduction),
    maxAge: PROFILE_SETUP_TTL_SECONDS,
  } as const;
}

export function clearSessionCookie(reply: { clearCookie: (name: string, options: ReturnType<typeof sessionCookieOptions>) => unknown }) {
  reply.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
}

export function clearProfileSetupCookie(reply: { clearCookie: (name: string, options: ReturnType<typeof profileSetupCookieOptions>) => unknown }) {
  reply.clearCookie(PROFILE_SETUP_COOKIE_NAME, profileSetupCookieOptions());
}

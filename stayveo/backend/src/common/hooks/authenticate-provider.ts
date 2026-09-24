import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  clearProviderSessionCookie,
  getProviderSession,
  PROVIDER_SESSION_COOKIE_NAME,
  touchProviderSession,
  type ProviderSessionData,
} from '../auth/provider-session.js';

export interface AuthenticatedProvider {
  userId: string;
  role: string;
  profileId?: string;
  phone?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    providerAuth?: AuthenticatedProvider;
    providerSession?: ProviderSessionData;
  }
}

/** Validate the provider-only HttpOnly session and attach its identity. */
export async function authenticateProvider(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies[PROVIDER_SESSION_COOKIE_NAME];
  if (!sessionId) {
    return reply.status(401).send({
      success: false,
      data: null,
      message: 'Provider authentication required',
    });
  }

  let session: ProviderSessionData | null;
  try {
    session = await getProviderSession(request.server.redis, sessionId);
  } catch (error) {
    request.server.log.error({ err: error }, 'Provider session validation failed');
    return reply.status(503).send({
      success: false,
      data: null,
      message: 'Authentication service temporarily unavailable',
    });
  }

  if (!session) {
    clearProviderSessionCookie(reply);
    return reply.status(401).send({
      success: false,
      data: null,
      message: 'Provider session expired or invalid',
    });
  }

  const user = await request.server.prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      providerProfile: { select: { id: true, phone: true } },
    },
  });

  if (!user || user.role !== 'PROVIDER' || user.role !== session.role) {
    await request.server.redis.del(`provider:session:${sessionId}`);
    clearProviderSessionCookie(reply);
    return reply.status(401).send({
      success: false,
      data: null,
      message: 'Provider session is no longer valid',
    });
  }

  try {
    const touchedSession = await touchProviderSession(request.server.redis, sessionId, session);
    if (!touchedSession) {
      clearProviderSessionCookie(reply);
      return reply.status(401).send({
        success: false,
        data: null,
        message: 'Provider session expired or invalid',
      });
    }
    request.providerSession = touchedSession;
  } catch (error) {
    request.server.log.error({ err: error }, 'Provider session activity update failed');
    return reply.status(503).send({
      success: false,
      data: null,
      message: 'Authentication service temporarily unavailable',
    });
  }

  request.user = { id: user.id, role: user.role };
  request.providerAuth = {
    userId: user.id,
    role: user.role,
    profileId: user.providerProfile?.id || session.providerId || undefined,
    phone: user.providerProfile?.phone || undefined,
  };
}

/** Use on shared student/provider resources without requiring a provider cookie. */
export async function optionalAuthenticateProvider(request: FastifyRequest, reply: FastifyReply) {
  if (!request.cookies[PROVIDER_SESSION_COOKIE_NAME]) return;
  await authenticateProvider(request, reply);
}

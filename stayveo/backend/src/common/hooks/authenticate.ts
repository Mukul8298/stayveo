import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  clearSessionCookie,
  deleteSession,
  getSession,
  SESSION_COOKIE_NAME,
  touchSessionById,
  type SessionData,
} from '../auth/session.js';

export interface AuthenticatedUser {
  id: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    session?: SessionData;
  }
}

/** Validate the HttpOnly session cookie and attach the current user identity. */
export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return;

  const session = await getSession(request.server.redis, sessionId);
  if (!session) {
    clearSessionCookie(reply);
    return;
  }

  const user = await request.server.prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== session.role) {
    await deleteSession(request.server.redis, sessionId, session.userId);
    clearSessionCookie(reply);
    return;
  }

  const touchedSession = await touchSessionById(request.server.redis, sessionId, session);
  if (!touchedSession) {
    clearSessionCookie(reply);
    return;
  }

  request.user = { id: user.id, role: user.role };
  request.session = touchedSession;
}

/** Strict variant for protected routes. */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  await optionalAuthenticate(request, reply);
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      data: null,
      message: 'Authentication required',
    });
  }
}

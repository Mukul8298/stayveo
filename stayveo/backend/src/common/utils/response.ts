// ─── Standard API Response Helpers ──────────────────────────────────────
// Every API response follows: { success, data, message }
// ────────────────────────────────────────────────────────────────────────

import { FastifyReply } from 'fastify';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

/** Send a success response */
export function sendSuccess<T>(reply: FastifyReply, data: T, message = 'OK', statusCode = 200) {
  const body: ApiResponse<T> = { success: true, data, message };
  return reply.status(statusCode).send(body);
}

/** Send a created (201) response */
export function sendCreated<T>(reply: FastifyReply, data: T, message = 'Created successfully') {
  return sendSuccess(reply, data, message, 201);
}

/** Send an error response */
export function sendError(reply: FastifyReply, message: string, statusCode = 400) {
  const body: ApiResponse<null> = { success: false, data: null, message };
  return reply.status(statusCode).send(body);
}

/** Send a not-found response */
export function sendNotFound(reply: FastifyReply, message = 'Resource not found') {
  return sendError(reply, message, 404);
}

/** Send a conflict response */
export function sendConflict(reply: FastifyReply, message = 'Resource already exists') {
  return sendError(reply, message, 409);
}

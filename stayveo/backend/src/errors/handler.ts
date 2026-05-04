// ─── Global Error Handler ───────────────────────────────────────────────
// Catches Zod validation errors, Prisma errors, and generic errors.
// Returns consistent { success, data, message } responses.
// ────────────────────────────────────────────────────────────────────────

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function globalErrorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // ── Zod Validation Errors ───────────────────────────────────────────
  if (error instanceof ZodError) {
    const messages = error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );
    return reply.status(400).send({
      success: false,
      data: null,
      message: `Validation failed: ${messages.join('; ')}`,
    });
  }

  // ── Prisma Known Request Errors ─────────────────────────────────────
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (error.meta?.target as string[])?.join(', ') || 'field';
        return reply.status(409).send({
          success: false,
          data: null,
          message: `Duplicate entry: ${fields} already exists`,
        });
      }
      case 'P2003': {
        // Foreign key constraint violation
        return reply.status(400).send({
          success: false,
          data: null,
          message: 'Related resource not found. Check your references.',
        });
      }
      case 'P2025': {
        // Record not found
        return reply.status(404).send({
          success: false,
          data: null,
          message: 'Record not found',
        });
      }
      default:
        return reply.status(500).send({
          success: false,
          data: null,
          message: `Database error: ${error.code}`,
        });
    }
  }

  // ── Prisma Validation Errors ────────────────────────────────────────
  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.status(400).send({
      success: false,
      data: null,
      message: 'Invalid data provided to database query',
    });
  }

  // ── Fastify-level Errors (e.g. 404, schema validation) ─────────────
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return reply.status(error.statusCode).send({
      success: false,
      data: null,
      message: error.message,
    });
  }

  // ── Catch-all ───────────────────────────────────────────────────────
  console.error('Unhandled error:', error);
  return reply.status(500).send({
    success: false,
    data: null,
    message: 'Internal server error',
  });
}

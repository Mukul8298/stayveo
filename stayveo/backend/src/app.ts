// ─── StayVeo Backend — Fastify App Factory ──────────────────────────────
// Registers all plugins, middleware, and routes.
// This is the single source of truth for how the app is assembled.
// ────────────────────────────────────────────────────────────────────────

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

// Plugins
import prismaPlugin from './plugins/prisma.js';

// Error handler
import { globalErrorHandler } from './errors/handler.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import studentRoutes from './modules/student/student.routes.js';
import providerRoutes, { providerOnboardingRoutes } from './modules/provider/provider.routes.js';
import serviceRoutes from './modules/services/service.routes.js';
import pgRoutes from './modules/pg/pg.routes.js';
import tiffinRoutes from './modules/tiffin/tiffin.routes.js';
import laundryRoutes from './modules/laundry/laundry.routes.js';
import cleaningRoutes from './modules/cleaning/cleaning.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import visitRoutes from './modules/visits/visit.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import profileViewRoutes from './modules/profile-views/profile-view.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ── Global Error Handler ──────────────────────────────────────────
  app.setErrorHandler(globalErrorHandler);

  // ── Core Plugins ──────────────────────────────────────────────────
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return cb(null, true);
      // Always allow localhost
      if (origin.includes('localhost')) return cb(null, true);
      // Allow all Cloudflare tunnel URLs
      if (origin.endsWith('.trycloudflare.com')) return cb(null, true);
      // Allow all ngrok URLs
      if (origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) return cb(null, true);
      // Block everything else in production
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-provider-phone'],
    credentials: true,
  });
  await app.register(sensible); // adds httpErrors, to(), etc.
  await app.register(prismaPlugin);

  // ── Health Check ──────────────────────────────────────────────────
  app.get('/health', async () => ({
    success: true,
    data: { status: 'healthy', timestamp: new Date().toISOString() },
    message: 'StayVeo API is running',
  }));

  // ── API Routes ────────────────────────────────────────────────────
  // All routes are prefixed with /api/v1 for versioning
  await app.register(
    async function apiV1(api) {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(userRoutes, { prefix: '/users' });
      await api.register(userRoutes, { prefix: '/user' });
      await api.register(studentRoutes, { prefix: '/student' });
      await api.register(providerRoutes, { prefix: '/provider' });
      await api.register(serviceRoutes, { prefix: '/provider/services' });
      await api.register(pgRoutes, { prefix: '/pg' });
      await api.register(tiffinRoutes, { prefix: '/tiffin' });
      await api.register(laundryRoutes, { prefix: '/laundry' });
      await api.register(cleaningRoutes, { prefix: '/cleaning' });
      await api.register(mediaRoutes, { prefix: '/media' });
      await api.register(documentRoutes, { prefix: '/documents' });
      await api.register(bookingRoutes, { prefix: '/bookings' });
      await api.register(visitRoutes, { prefix: '/visits' });
      await api.register(paymentRoutes, { prefix: '/payments' });
      await api.register(profileViewRoutes, { prefix: '/profile-views' });
    },
    { prefix: '/api/v1' }
  );

  await app.register(providerOnboardingRoutes, { prefix: '/api/provider' });

  // ── 404 Handler ───────────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      data: null,
      message: 'Route not found',
    });
  });

  return app;
}

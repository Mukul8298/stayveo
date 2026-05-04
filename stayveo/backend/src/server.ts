// ─── StayVeo Backend — Server Entry Point ───────────────────────────────
// Loads environment, builds the Fastify app, and starts listening.
// ────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 StayVeo API running at http://${HOST}:${PORT}`);
    app.log.info(`📋 Health check: http://${HOST}:${PORT}/health`);
    app.log.info(`📡 API base: http://${HOST}:${PORT}/api/v1`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

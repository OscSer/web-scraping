import Fastify from "fastify";
import { config } from "./config/index.js";
import { tickerRoutes } from "./routes/ticker.js";
import { tokenManager } from "./services/token-manager.js";
import { logger } from "./utils/logger.js";

const fastify = Fastify({
  logger,
});

fastify.register(tickerRoutes);

function logStartupBanner() {
  fastify.log.info("BVC Crawler API started");
  fastify.log.info(
    `Server running at: http://${config.server.host}:${config.server.port}`,
  );
  fastify.log.info("Endpoints:");
  fastify.log.info("  GET /ticker/:ticker");
  fastify.log.info(`Cache TTL: ${config.cache.ttlSeconds}s`);
  fastify.log.info("Token source: HTTP (auto-fetch from BVC bundle)");
}

async function start() {
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logStartupBanner();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  fastify.log.info(`\n[${signal}] Shutting down server...`);
  try {
    await tokenManager.cleanup();
    await fastify.close();
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();

import { timingSafeEqual } from "node:crypto";
import Fastify from "fastify";
import { config } from "./config/index.js";
import { tickerRoutes } from "./routes/ticker.js";
import { tokenManager } from "./services/token-manager.js";
import { logger } from "./utils/logger.js";

const fastify = Fastify({
  logger,
  trustProxy: true,
});

function hasValidApiKeyHeader(rawHeaderValue: unknown): boolean {
  if (!config.auth.apiKey) return false;
  if (typeof rawHeaderValue !== "string") return false;

  const apiKeyBuffer = Buffer.from(config.auth.apiKey);
  const headerBuffer = Buffer.from(rawHeaderValue);

  if (apiKeyBuffer.length !== headerBuffer.length) return false;

  return timingSafeEqual(apiKeyBuffer, headerBuffer);
}

if (!config.auth.isDisabled && !config.auth.apiKey) {
  fastify.log.error(
    "Missing required env var: API_KEY. Refusing to start (fail-closed).",
  );
  process.exit(1);
}

fastify.addHook("onRequest", async (request, reply) => {
  if (config.auth.isDisabled) return;

  const apiKeyHeader = request.headers["x-api-key"];
  if (hasValidApiKeyHeader(apiKeyHeader)) return;

  await reply.code(401).send({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    },
  });
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

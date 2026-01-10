import { timingSafeEqual } from "node:crypto";
import Fastify from "fastify";
import { config } from "./config/index.js";
import { tickerRoutes } from "./routes/ticker.js";
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
    "Missing required env var: API_KEY. Refusing to start (fail-closed)."
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

async function start() {
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  fastify.log.info(`\n[${signal}] Shutting down server...`);
  try {
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

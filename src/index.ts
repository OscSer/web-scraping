import Fastify from "fastify";
import { aiDomain } from "./domains/ai/index.js";
import { bvcDomain } from "./domains/bvc/index.js";
import { gameDomain } from "./domains/game/index.js";
import { config } from "./shared/config/index.js";
import { createApiKeyOnRequestHook } from "./shared/utils/api-key-auth.js";

const fastify = Fastify({
  forceCloseConnections: true,
  logger: {
    level: config.env.logLevel,
  },
});

if (!config.auth.isDisabled && !config.auth.apiKey) {
  fastify.log.error("Missing required env var: API_KEY. Refusing to start (fail-closed)");
  process.exit(1);
}

fastify.addHook("onRequest", createApiKeyOnRequestHook(config.auth));

fastify.register(bvcDomain);
fastify.register(gameDomain);
fastify.register(aiDomain);

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

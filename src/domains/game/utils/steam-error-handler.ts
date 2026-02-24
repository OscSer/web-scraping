import type { FastifyBaseLogger } from "fastify";

export function handleSteamError<T>(
  logger: FastifyBaseLogger,
  error: unknown,
  appId: string,
  context: string,
  fallbackValue: T,
): T {
  logger.error({ err: error, appId }, `Unexpected error in ${context}`);
  return fallbackValue;
}

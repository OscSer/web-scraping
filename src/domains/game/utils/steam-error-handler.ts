import type { FastifyBaseLogger } from "fastify";
import { SteamFetchError, SteamParseError } from "../types/errors.js";

export function handleSteamError<T>(
  logger: FastifyBaseLogger,
  error: unknown,
  appId: string,
  context: string,
  fallbackValue: T,
): T {
  if (error instanceof SteamFetchError || error instanceof SteamParseError) {
    logger.warn({ err: error, appId }, `Failed to fetch ${context}, using fallback`);
  } else {
    logger.error({ err: error, appId }, `Unexpected error in ${context}`);
  }
  return fallbackValue;
}

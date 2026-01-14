import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { logger } from "../../../shared/utils/logger.js";

export function handleSteamError<T>(
  error: unknown,
  appId: string,
  context: string,
  fallbackValue: T,
): T {
  if (error instanceof SteamFetchError || error instanceof SteamParseError) {
    logger.warn(
      { err: error, appId },
      `[Game] Failed to fetch ${context}, using fallback`,
    );
  } else {
    logger.error(
      { err: error, appId },
      `[Game] Unexpected error in ${context}`,
    );
  }
  return fallbackValue;
}

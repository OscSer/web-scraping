import type { FastifyBaseLogger } from "fastify";
import { Cache } from "../types/cache.js";
import { config } from "../config/index.js";
import { UpstashCache } from "./upstash-cache.js";

class NoOpCache<T> implements Cache<T> {
  async get(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {
    return;
  }

  async getOrFetch(_key: string, fetcher: () => Promise<T>): Promise<T> {
    return fetcher();
  }
}

export function createCache<T>(
  ttlMs: number,
  logger: FastifyBaseLogger,
): Cache<T> {
  if (config.cache.isDisabled) {
    return new NoOpCache<T>();
  }

  const cacheLogger = logger.child({}, { msgPrefix: "[Cache] " });
  return new UpstashCache<T>(ttlMs, cacheLogger);
}

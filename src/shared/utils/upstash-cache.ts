import { Redis } from "@upstash/redis";
import { Cache } from "../types/cache.js";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    if (!config.cache.upstash.url || !config.cache.upstash.token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set",
      );
    }

    redisClient = new Redis({
      url: config.cache.upstash.url,
      token: config.cache.upstash.token,
    });
  }

  return redisClient;
}

interface CacheMetadata {
  type: "map" | "object";
}

export class UpstashCache<T> implements Cache<T> {
  private redis: Redis;
  private pendingRequests = new Map<string, Promise<T>>();
  private readonly ttlSeconds: number;
  private readonly keyPrefix = "web-scraping:";

  constructor(ttlMs: number) {
    this.redis = getRedisClient();
    this.ttlSeconds = Math.ceil(ttlMs / 1000);
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private getMetadataKey(key: string): string {
    return `${this.keyPrefix}${key}:meta`;
  }

  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const [value, metadata] = await Promise.all([
        this.redis.get(fullKey),
        this.redis.get<CacheMetadata>(this.getMetadataKey(key)),
      ]);

      if (value === null) {
        return null;
      }

      if (metadata?.type === "map") {
        if (typeof value !== "object" || Array.isArray(value)) {
          logger.error(
            { key, value },
            "[UpstashCache] Invalid value type for map metadata",
          );
          return null;
        }
        return new Map(Object.entries(value as Record<string, unknown>)) as T;
      }

      return value as T;
    } catch (error) {
      logger.error(
        { err: error, key },
        "[UpstashCache] Error getting value from cache",
      );
      return null;
    }
  }

  async set(key: string, data: T): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      let value: unknown;
      let metadata: CacheMetadata | null = null;

      if (data instanceof Map) {
        value = Object.fromEntries(data);
        metadata = { type: "map" };
      } else {
        value = data;
        metadata = { type: "object" };
      }

      await Promise.all([
        this.redis.setex(fullKey, this.ttlSeconds, value),
        this.redis.setex(this.getMetadataKey(key), this.ttlSeconds, metadata),
      ]);
    } catch (error) {
      logger.error(
        { err: error, key },
        "[UpstashCache] Error setting value in cache",
      );
    }
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      if (process.env.NODE_ENV !== "production") {
        logger.info({ key }, "[UpstashCache] Cache hit");
      }
      return cached;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then(async (result) => {
        await this.set(key, result);
        if (process.env.NODE_ENV !== "production") {
          logger.info({ key }, "[UpstashCache] Cache miss - stored new value");
        }
        return result;
      })
      .catch((error) => {
        logger.error(
          { err: error, key },
          "[UpstashCache] Error fetching value",
        );
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.pendingRequests.clear();
    } catch (error) {
      logger.error({ err: error }, "[UpstashCache] Error clearing cache");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const metadataKey = this.getMetadataKey(key);
      await this.redis.del(fullKey, metadataKey);
    } catch (error) {
      logger.error({ err: error, key }, "[UpstashCache] Error deleting key");
    }
  }
}

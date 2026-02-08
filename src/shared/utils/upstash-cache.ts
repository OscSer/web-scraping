import { Redis } from "@upstash/redis";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";
import { Cache } from "../types/cache.js";

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    if (!config.cache.upstash.url || !config.cache.upstash.token) {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
    }

    redisClient = new Redis({
      url: config.cache.upstash.url,
      token: config.cache.upstash.token,
    });
  }

  return redisClient;
}

export class UpstashCache<T> implements Cache<T> {
  private redis: Redis;
  private pendingRequests = new Map<string, Promise<T>>();
  private readonly ttlSeconds: number;
  private readonly keyPrefix = "ws:";
  private readonly logger: FastifyBaseLogger;

  constructor(ttlMs: number, logger: FastifyBaseLogger) {
    this.redis = getRedisClient();
    this.ttlSeconds = Math.ceil(ttlMs / 1000);
    this.logger = logger;
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      return value as T;
    } catch (error) {
      this.logger.error({ err: error, key }, "Error getting value from cache");
      return null;
    }
  }

  async set(key: string, data: T): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.redis.setex(fullKey, this.ttlSeconds, data);
    } catch (error) {
      this.logger.error({ err: error, key }, "Error setting value in cache");
    }
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      if (process.env.NODE_ENV !== "production") {
        this.logger.info({ key }, "Cache hit");
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
          this.logger.info({ key }, "Cache miss - stored new value");
        }
        return result;
      })
      .catch((error) => {
        this.logger.error({ err: error, key }, "Error fetching value");
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

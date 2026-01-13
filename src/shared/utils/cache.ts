import { Cache, CacheEntry } from "../types/cache.js";

export class InMemoryCache<T> implements Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private pendingRequests = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: T): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then(async (result) => {
        await this.set(key, result);
        return result;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

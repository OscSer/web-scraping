import { describe, expect, it, vi } from "vitest";

async function loadCreateCache(cacheDisabled: boolean) {
  vi.resetModules();

  const childLogger = { info: vi.fn(), error: vi.fn() };
  const logger = {
    child: vi.fn().mockReturnValue(childLogger),
  };

  const upstashInstance = {
    get: vi.fn(),
    set: vi.fn(),
    getOrFetch: vi.fn(),
  };

  const upstashConstructorSpy = vi.fn();
  class UpstashCacheMock {
    get = upstashInstance.get;
    set = upstashInstance.set;
    getOrFetch = upstashInstance.getOrFetch;

    constructor(ttlMs: number, logger: unknown) {
      upstashConstructorSpy(ttlMs, logger);
    }
  }

  vi.doMock("../config/index.js", () => ({
    config: {
      cache: {
        isDisabled: cacheDisabled,
        upstash: {
          url: "https://upstash.test",
          token: "token",
        },
      },
    },
  }));

  vi.doMock("./upstash-cache.js", () => ({
    UpstashCache: UpstashCacheMock,
  }));

  const { createCache } = await import("./cache-factory.js");

  return {
    createCache,
    logger,
    childLogger,
    UpstashCacheMock,
    upstashConstructorSpy,
  };
}

describe("createCache", () => {
  it("returns no-op cache when caching is disabled", async () => {
    const { createCache, logger, upstashConstructorSpy } = await loadCreateCache(true);
    const cache = createCache<number>(1000, logger as never);

    expect(logger.child).not.toHaveBeenCalled();
    expect(upstashConstructorSpy).not.toHaveBeenCalled();

    await expect(cache.get("key")).resolves.toBeNull();
    await expect(cache.set("key", 1)).resolves.toBeUndefined();

    const fetcher = vi.fn().mockResolvedValue(42);
    await expect(cache.getOrFetch("key", fetcher)).resolves.toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns Upstash cache with child logger when caching is enabled", async () => {
    const { createCache, logger, childLogger, UpstashCacheMock, upstashConstructorSpy } =
      await loadCreateCache(false);

    const cache = createCache<number>(2500, logger as never);

    expect(logger.child).toHaveBeenCalledWith({}, { msgPrefix: "[Cache] " });
    expect(upstashConstructorSpy).toHaveBeenCalledWith(2500, childLogger);
    expect(cache).toBeInstanceOf(UpstashCacheMock);
  });
});

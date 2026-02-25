import { describe, expect, it, vi } from "vitest";

interface LoadOptions {
  url?: string;
  token?: string;
  nodeEnv?: string;
  getImpl?: () => Promise<unknown>;
  setexImpl?: () => Promise<unknown>;
}

async function loadUpstashCacheModule(options: LoadOptions = {}) {
  vi.resetModules();

  const getMock = vi.fn(options.getImpl ?? (async () => null));
  const setexMock = vi.fn(options.setexImpl ?? (async () => "OK"));

  const redisConstructorSpy = vi.fn();

  class RedisMock {
    get = getMock;
    setex = setexMock;

    constructor(params: unknown) {
      redisConstructorSpy(params);
    }
  }

  vi.doMock("@upstash/redis", () => ({
    Redis: RedisMock,
  }));

  vi.doMock("../config/index.js", () => ({
    config: {
      env: {
        nodeEnv: options.nodeEnv ?? "development",
      },
      cache: {
        upstash: {
          url: options.url,
          token: options.token,
        },
      },
    },
  }));

  const { UpstashCache } = await import("./upstash-cache.js");

  return {
    UpstashCache,
    getMock,
    setexMock,
    redisConstructorSpy,
  };
}

describe("UpstashCache", () => {
  it("throws when credentials are missing", async () => {
    const { UpstashCache } = await loadUpstashCacheModule();
    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };

    expect(() => new UpstashCache<number>(1000, logger as never)).toThrow(
      "UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set",
    );
  });

  it("gets cached values with prefixed keys", async () => {
    const { UpstashCache, getMock } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => 9,
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);

    await expect(cache.get("game:1")).resolves.toBe(9);
    expect(getMock).toHaveBeenCalledWith("ws:game:1");
  });

  it("returns null and logs when get fails", async () => {
    const { UpstashCache } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => {
        throw new Error("redis-get-error");
      },
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);

    await expect(cache.get("game:1")).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1", err: expect.any(Error) }),
      "Error getting value from cache",
    );
  });

  it("stores values using ttl in seconds rounded up", async () => {
    const { UpstashCache, setexMock } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1500, logger as never);

    await cache.set("game:1", 88);

    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 2, 88);
  });

  it("logs and does not throw when set fails", async () => {
    const { UpstashCache } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      setexImpl: async () => {
        throw new Error("redis-set-error");
      },
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);

    await expect(cache.set("game:1", 88)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1", err: expect.any(Error) }),
      "Error setting value in cache",
    );
  });

  it("returns cached value on cache hit without calling fetcher", async () => {
    const { UpstashCache } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => 72,
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);
    const fetcher = vi.fn().mockResolvedValue(99);

    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(72);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches and stores value on cache miss", async () => {
    const { UpstashCache, setexMock } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => null,
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);
    const fetcher = vi.fn().mockResolvedValue(55);

    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(55);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 1, 55);
  });

  it("coalesces concurrent misses for the same key", async () => {
    const { UpstashCache, setexMock } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => null,
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);

    let resolveFetcher: ((value: number) => void) | null = null;
    const fetcher = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveFetcher = resolve;
        }),
    );

    const first = cache.getOrFetch("game:1", fetcher);
    const second = cache.getOrFetch("game:1", fetcher);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    resolveFetcher?.(77);

    await expect(Promise.all([first, second])).resolves.toEqual([77, 77]);
    expect(setexMock).toHaveBeenCalledTimes(1);
  });

  it("clears pending requests after fetcher failure", async () => {
    const { UpstashCache } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => null,
    });

    const logger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };
    const cache = new UpstashCache<number>(1000, logger as never);

    const fetcher = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("fetch-error"))
      .mockResolvedValueOnce(81);

    await expect(cache.getOrFetch("game:1", fetcher)).rejects.toThrow("fetch-error");
    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(81);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

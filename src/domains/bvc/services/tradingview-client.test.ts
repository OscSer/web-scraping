import { describe, expect, it, vi } from "vitest";

interface LoadOptions {
  getOrFetchImpl?: (key: string, fetcher: () => Promise<number>) => Promise<number>;
}

async function loadTradingViewClient(options: LoadOptions = {}) {
  vi.resetModules();

  const getOrFetch = vi.fn(
    options.getOrFetchImpl ??
      (async (_key: string, fetcher: () => Promise<number>) => {
        return fetcher();
      }),
  );

  const createCache = vi.fn().mockReturnValue({
    getOrFetch,
  });

  const fetchWithTimeout = vi.fn();
  const buildFetchHeaders = vi
    .fn()
    .mockImplementation((headers?: Record<string, string>) => headers ?? {});

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache,
  }));

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));

  const { TradingViewClient } = await import("./tradingview-client.js");

  return {
    TradingViewClient,
    getOrFetch,
    createCache,
    fetchWithTimeout,
    buildFetchHeaders,
  };
}

describe("TradingViewClient", () => {
  it("returns null for invalid ticker input", async () => {
    const { TradingViewClient, getOrFetch } = await loadTradingViewClient();
    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("   ")).resolves.toBeNull();
    expect(getOrFetch).not.toHaveBeenCalled();
  });

  it("returns normalized ticker and price when fetch succeeds", async () => {
    const { TradingViewClient, fetchWithTimeout, getOrFetch } = await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response(JSON.stringify({ close: 1234.5 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 1234.5,
      source: "tradingview",
    });

    expect(getOrFetch).toHaveBeenCalledWith("stock:ecopetrol", expect.any(Function));
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("throws BvcFetchError when api response is not ok", async () => {
    const { TradingViewClient, fetchWithTimeout } = await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 502, statusText: "Bad Gateway" }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcFetchError",
    });
  });

  it("throws BvcParseError when close is invalid", async () => {
    const { TradingViewClient, fetchWithTimeout } = await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response(JSON.stringify({ close: "n/a" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcParseError",
    });
  });

  it("returns null on unexpected cache errors", async () => {
    const { TradingViewClient } = await loadTradingViewClient({
      getOrFetchImpl: async () => {
        throw new Error("cache error");
      },
    });

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toBeNull();
  });
});

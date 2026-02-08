import { describe, expect, it, vi } from "vitest";

interface LoadOptions {
  getOrFetchImpl?: (
    key: string,
    fetcher: () => Promise<Record<string, number>>,
  ) => Promise<Record<string, number>>;
}

async function loadTriiClient(options: LoadOptions = {}) {
  vi.resetModules();

  const getOrFetch = vi.fn(
    options.getOrFetchImpl ??
      (async (_key: string, fetcher: () => Promise<Record<string, number>>) => {
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

  const { TriiClient } = await import("./trii-client.js");

  return {
    TriiClient,
    getOrFetch,
    fetchWithTimeout,
  };
}

describe("TriiClient", () => {
  it("returns null for invalid ticker input", async () => {
    const { TriiClient, getOrFetch } = await loadTriiClient();
    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("  ")).resolves.toBeNull();
    expect(getOrFetch).not.toHaveBeenCalled();
  });

  it("parses html and returns ticker data", async () => {
    const { TriiClient, fetchWithTimeout, getOrFetch } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response('<h3>ecopetrol</h3><div class="title">$ 1,234.56</div>', {
        status: 200,
      }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 1234.56,
      source: "trii",
    });
    expect(getOrFetch).toHaveBeenCalledWith("trii-stock-list", expect.any(Function));
  });

  it("throws BvcFetchError when html request fails", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 503, statusText: "Unavailable" }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcFetchError",
    });
  });

  it("throws BvcParseError when html has no valid prices", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("<html><body>No cards</body></html>", { status: 200 }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcParseError",
    });
  });

  it("returns null when ticker is not present in parsed map", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response('<h3>pfgrupsura</h3><div class="title">$ 12,000</div>', {
        status: 200,
      }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toBeNull();
  });
});

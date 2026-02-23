import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tickerRoutes } from "./ticker.js";

interface TickerServiceMock {
  getPriceByTicker: (ticker: string) => Promise<{
    ticker: string;
    price: number;
    source: "trii" | "tradingview";
  } | null>;
}

function createServer(triiClient: TickerServiceMock, tradingViewClient: TickerServiceMock) {
  const app = Fastify({ logger: false });
  app.register(tickerRoutes, {
    triiClient: triiClient as never,
    tradingViewClient: tradingViewClient as never,
  });
  return app;
}

describe("tickerRoutes", () => {
  const apps: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("returns 400 for invalid ticker", async () => {
    const triiClient = { getPriceByTicker: vi.fn().mockResolvedValue(null) };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockResolvedValue(null),
    };
    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/ticker/%20%20" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_TICKER",
        message: "Ticker is required",
      },
    });
  });

  it("returns trii value when available", async () => {
    const triiClient = {
      getPriceByTicker: vi.fn().mockResolvedValue({
        ticker: "ECOPETROL",
        price: 1234,
        source: "trii",
      }),
    };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockResolvedValue(null),
    };
    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ticker/ecopetrol",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ticker: "ECOPETROL",
      price: 1234,
      source: "trii",
    });
    expect(tradingViewClient.getPriceByTicker).not.toHaveBeenCalled();
  });

  it("falls back to tradingview when trii returns null", async () => {
    const triiClient = { getPriceByTicker: vi.fn().mockResolvedValue(null) };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockResolvedValue({
        ticker: "ECOPETROL",
        price: 1220,
        source: "tradingview",
      }),
    };
    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ticker/ecopetrol",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ticker: "ECOPETROL",
      price: 1220,
      source: "tradingview",
    });
  });

  it("returns 404 when both providers return null", async () => {
    const triiClient = { getPriceByTicker: vi.fn().mockResolvedValue(null) };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockResolvedValue(null),
    };
    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ticker/ecopetrol",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "TICKER_NOT_FOUND",
        message: 'Ticker "ecopetrol" not found',
      },
    });
  });

  it("returns 502 when trii and fallback both fail", async () => {
    const triiClient = {
      getPriceByTicker: vi.fn().mockRejectedValue(new Error("trii fail")),
    };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockRejectedValue(new Error("tradingview fail")),
    };
    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ticker/ecopetrol",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: "FETCH_ERROR",
        message: "Error fetching ticker price",
      },
    });
  });

  it("returns tradingview value when trii throws and fallback succeeds", async () => {
    const triiClient = {
      getPriceByTicker: vi.fn().mockRejectedValue(new Error("trii fail")),
    };
    const tradingViewClient = {
      getPriceByTicker: vi.fn().mockResolvedValue({
        ticker: "ECOPETROL",
        price: 1210,
        source: "tradingview",
      }),
    };

    const app = createServer(triiClient, tradingViewClient);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ticker/ecopetrol",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ticker: "ECOPETROL",
      price: 1210,
      source: "tradingview",
    });
    expect(tradingViewClient.getPriceByTicker).toHaveBeenCalledTimes(1);
  });
});

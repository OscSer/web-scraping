import { describe, expect, it, vi } from "vitest";

interface LoadOptions {
  handleSteamErrorImpl?: (
    logger: unknown,
    error: unknown,
    appId: string,
    context: string,
    fallbackValue: unknown,
  ) => unknown;
}

async function loadSteamReviewsApiClient(options: LoadOptions = {}) {
  vi.resetModules();

  const fetchWithTimeout = vi.fn();
  const buildFetchHeaders = vi
    .fn()
    .mockImplementation((headers?: Record<string, string>) => headers ?? {});

  const rateLimiter = vi.fn(async (fn: () => Promise<unknown>) => {
    return fn();
  });

  const createRateLimiter = vi.fn().mockReturnValue(rateLimiter);

  const handleSteamError = vi.fn(
    options.handleSteamErrorImpl ??
      ((_logger, _error, _appId, _context, fallbackValue) => {
        return fallbackValue;
      }),
  );

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));

  vi.doMock("../../../shared/utils/global-rate-limiter.js", () => ({
    createRateLimiter,
  }));

  vi.doMock("../utils/steam-error-handler.js", () => ({
    handleSteamError,
  }));

  const { SteamReviewsApiClient } = await import("./steam-reviews-api-client.js");

  return {
    SteamReviewsApiClient,
    fetchWithTimeout,
    buildFetchHeaders,
    createRateLimiter,
    rateLimiter,
    handleSteamError,
  };
}

describe("SteamReviewsApiClient", () => {
  it("returns rounded score from Steam reviews payload", async () => {
    const {
      SteamReviewsApiClient,
      fetchWithTimeout,
      buildFetchHeaders,
      createRateLimiter,
      rateLimiter,
    } = await loadSteamReviewsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: 1,
          query_summary: {
            total_positive: 2,
            total_reviews: 3,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamReviewsApiClient({ warn: vi.fn(), error: vi.fn() } as never);

    await expect(client.getScoreByAppId("47780")).resolves.toEqual({ score: 66.67 });

    expect(createRateLimiter).toHaveBeenCalledWith(10);
    expect(rateLimiter).toHaveBeenCalledTimes(1);
    expect(buildFetchHeaders).toHaveBeenCalledWith({
      Accept: "application/json",
    });
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "https://store.steampowered.com/appreviews/47780?json=1&filter=all&language=all&purchase_type=all&num_per_page=0",
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  });

  it("throws SteamFetchError when response is not ok", async () => {
    const { SteamReviewsApiClient, fetchWithTimeout } = await loadSteamReviewsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response("error", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    const client = new SteamReviewsApiClient({ warn: vi.fn(), error: vi.fn() } as never);

    await expect(client.getScoreByAppId("47780")).rejects.toMatchObject({
      name: "SteamFetchError",
    });
  });

  it("throws SteamParseError when success flag is not 1", async () => {
    const { SteamReviewsApiClient, fetchWithTimeout } = await loadSteamReviewsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: 0,
          query_summary: {
            total_positive: 5,
            total_reviews: 10,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamReviewsApiClient({ warn: vi.fn(), error: vi.fn() } as never);

    await expect(client.getScoreByAppId("47780")).rejects.toMatchObject({
      name: "SteamParseError",
    });
  });

  it("throws SteamParseError when score cannot be calculated", async () => {
    const { SteamReviewsApiClient, fetchWithTimeout } = await loadSteamReviewsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: 1,
          query_summary: {
            total_positive: 0,
            total_reviews: 0,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamReviewsApiClient({ warn: vi.fn(), error: vi.fn() } as never);

    await expect(client.getScoreByAppId("47780")).rejects.toMatchObject({
      name: "SteamParseError",
    });
  });

  it("delegates unexpected errors to steam error handler", async () => {
    const { SteamReviewsApiClient, fetchWithTimeout, handleSteamError } =
      await loadSteamReviewsApiClient();

    fetchWithTimeout.mockRejectedValue(new Error("network-failure"));

    const logger = { warn: vi.fn(), error: vi.fn() };
    const client = new SteamReviewsApiClient(logger as never);

    await expect(client.getScoreByAppId("47780")).resolves.toBeNull();
    expect(handleSteamError).toHaveBeenCalledWith(
      logger,
      expect.any(Error),
      "47780",
      "Steam Reviews API client",
      null,
    );
  });
});

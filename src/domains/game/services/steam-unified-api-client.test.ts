import { describe, expect, it, vi } from "vitest";

interface LoadOptions {
  cacheResult?: { name: string; score: number };
  gameName?: string;
  scoreResult?: { score: number } | null;
}

async function loadSteamUnifiedClient(options: LoadOptions = {}) {
  vi.resetModules();

  const getGameNameByAppId = vi.fn().mockResolvedValue(options.gameName ?? "Dead Space 2");
  const getScoreByAppId = vi
    .fn()
    .mockResolvedValue(options.scoreResult === undefined ? { score: 91.4 } : options.scoreResult);

  const detailsConstructorSpy = vi.fn();
  const reviewsConstructorSpy = vi.fn();

  class SteamDetailsApiClientMock {
    getGameNameByAppId = getGameNameByAppId;

    constructor(logger: unknown) {
      detailsConstructorSpy(logger);
    }
  }

  class SteamReviewsApiClientMock {
    getScoreByAppId = getScoreByAppId;

    constructor(logger: unknown) {
      reviewsConstructorSpy(logger);
    }
  }

  const getOrFetch = vi.fn(
    async (_key: string, fetcher: () => Promise<{ name: string; score: number }>) => {
      if (options.cacheResult) {
        return options.cacheResult;
      }
      return fetcher();
    },
  );

  const createCache = vi.fn().mockReturnValue({
    getOrFetch,
  });

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache,
  }));

  vi.doMock("./steam-details-api-client.js", () => ({
    SteamDetailsApiClient: SteamDetailsApiClientMock,
  }));

  vi.doMock("./steam-reviews-api-client.js", () => ({
    SteamReviewsApiClient: SteamReviewsApiClientMock,
  }));

  const { createSteamUnifiedApiClient } = await import("./steam-unified-api-client.js");

  return {
    createSteamUnifiedApiClient,
    getGameNameByAppId,
    getScoreByAppId,
    getOrFetch,
    createCache,
    detailsConstructorSpy,
    reviewsConstructorSpy,
  };
}

describe("createSteamUnifiedApiClient", () => {
  it("combines details and reviews into unified game data", async () => {
    const {
      createSteamUnifiedApiClient,
      getGameNameByAppId,
      getScoreByAppId,
      getOrFetch,
      createCache,
    } = await loadSteamUnifiedClient();

    const logger = { child: vi.fn() };
    const client = createSteamUnifiedApiClient(logger as never);

    await expect(client.getGameData("47780")).resolves.toEqual({
      name: "Dead Space 2",
      score: 91.4,
    });

    expect(createCache).toHaveBeenCalledWith(1296000000, logger);
    expect(getOrFetch).toHaveBeenCalledWith("steam:47780", expect.any(Function));
    expect(getGameNameByAppId).toHaveBeenCalledWith("47780");
    expect(getScoreByAppId).toHaveBeenCalledWith("47780");
  });

  it("uses cache result without calling API clients", async () => {
    const { createSteamUnifiedApiClient, getGameNameByAppId, getScoreByAppId } =
      await loadSteamUnifiedClient({
        cacheResult: { name: "Cached Name", score: 88 },
      });

    const logger = { child: vi.fn() };
    const client = createSteamUnifiedApiClient(logger as never);

    await expect(client.getGameData("47780")).resolves.toEqual({
      name: "Cached Name",
      score: 88,
    });

    expect(getGameNameByAppId).not.toHaveBeenCalled();
    expect(getScoreByAppId).not.toHaveBeenCalled();
  });

  it("throws when score is unavailable", async () => {
    const { createSteamUnifiedApiClient } = await loadSteamUnifiedClient({
      scoreResult: null,
    });

    const logger = { child: vi.fn() };
    const client = createSteamUnifiedApiClient(logger as never);

    await expect(client.getGameData("47780")).rejects.toThrow(
      "Steam score is unavailable for app 47780",
    );
  });

  it("throws when score is not finite", async () => {
    const { createSteamUnifiedApiClient } = await loadSteamUnifiedClient({
      scoreResult: { score: Number.NaN },
    });

    const logger = { child: vi.fn() };
    const client = createSteamUnifiedApiClient(logger as never);

    await expect(client.getGameData("47780")).rejects.toThrow(
      "Steam score is invalid for app 47780",
    );
  });
});

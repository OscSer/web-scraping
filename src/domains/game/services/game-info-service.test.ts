import { describe, expect, it, vi } from "vitest";

async function loadGameInfoService() {
  vi.resetModules();

  const getGameData = vi.fn();
  const createSteamUnifiedApiClient = vi.fn().mockReturnValue({
    getGameData,
  });

  vi.doMock("./steam-unified-api-client.js", () => ({
    createSteamUnifiedApiClient,
  }));

  const module = await import("./game-info-service.js");

  return {
    ...module,
    getGameData,
    createSteamUnifiedApiClient,
  };
}

describe("GameInfoService", () => {
  it("maps unified client response into game info payload", async () => {
    const { GameInfoService, getGameData } = await loadGameInfoService();
    getGameData.mockResolvedValue({ name: "Dead Space 2", score: 91.4 });

    const logger = { child: vi.fn() };
    const service = new GameInfoService(logger as never);

    await expect(service.getGameInfoByAppId("47780")).resolves.toEqual({
      name: "Dead Space 2",
      score: 91.4,
      source: "steam",
    });
    expect(getGameData).toHaveBeenCalledWith("47780");
  });

  it("factory creates service instance", async () => {
    const { createGameInfoService, GameInfoService } = await loadGameInfoService();
    const logger = { child: vi.fn() };

    const service = createGameInfoService(logger as never);

    expect(service).toBeInstanceOf(GameInfoService);
  });
});

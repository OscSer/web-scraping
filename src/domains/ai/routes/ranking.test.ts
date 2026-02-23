import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rankingRoutes } from "./ranking.js";

interface ModelRankingServiceMock {
  getRanking: () => Promise<
    Array<{
      model: string;
      position: number;
      relative: number;
    }>
  >;
}

function createServer(modelRankingService: ModelRankingServiceMock) {
  const app = Fastify({ logger: false });
  app.register(rankingRoutes, {
    modelRankingService: modelRankingService as never,
  });
  return app;
}

describe("rankingRoutes", () => {
  const apps: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("returns ranked models", async () => {
    const modelRankingService = {
      getRanking: vi.fn().mockResolvedValue([
        {
          model: "Model B",
          position: 1,
          relative: 100,
        },
        {
          model: "Model A",
          position: 2,
          relative: 90.63,
        },
      ]),
    };

    const app = createServer(modelRankingService);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ranking",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: [
        {
          model: "Model B",
          position: 1,
          relative: 100,
        },
        {
          model: "Model A",
          position: 2,
          relative: 90.63,
        },
      ],
    });
  });

  it("returns 502 when ranking service fails", async () => {
    const modelRankingService = {
      getRanking: vi.fn().mockRejectedValue(new Error("ranking error")),
    };

    const app = createServer(modelRankingService);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/ranking",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: "SCRAPING_ERROR",
        message: "Unable to fetch AI ranking",
      },
    });
  });
});

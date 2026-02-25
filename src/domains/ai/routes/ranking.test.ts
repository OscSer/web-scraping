import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rankingRoutes } from "./ranking.js";

interface ModelRankingServiceMock {
  getRanking: () => Promise<
    Array<{
      model: string;
      position: number;
      score: number;
      price1m: number;
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
          score: 100,
          price1m: 0.5,
        },
        {
          model: "Model A",
          position: 2,
          score: 91,
          price1m: 1.5,
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
    expect(response.json()).toEqual([
      {
        model: "Model B",
        position: 1,
        score: 100,
        price1m: 0.5,
      },
      {
        model: "Model A",
        position: 2,
        score: 91,
        price1m: 1.5,
      },
    ]);
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
      error: {
        code: "SCRAPING_ERROR",
        message: "Unable to fetch AI ranking",
      },
    });
  });
});

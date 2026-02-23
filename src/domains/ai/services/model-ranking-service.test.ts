import { describe, expect, it, vi } from "vitest";
import { ModelRankingService } from "./model-ranking-service.js";

describe("ModelRankingService", () => {
  it("filters models without both scores and sorts by index descending", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 50, coding: 50 },
        { model: "Model B", agentic: 80, coding: 40 },
        { model: "Model C", agentic: 90, coding: null },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model B", index: 64, agentic: 80, coding: 40 },
      { model: "Model A", index: 50, agentic: 50, coding: 50 },
    ]);
  });

  it("throws when no model has both scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: null, coding: 50 },
        { model: "Model B", agentic: 80, coding: null },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("deduplicates by model and keeps highest index", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 90, coding: 40 },
        { model: "Model A", agentic: 70, coding: 70 },
        { model: "Model B", agentic: 80, coding: 40 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", index: 70, agentic: 90, coding: 40 },
      { model: "Model B", index: 64, agentic: 80, coding: 40 },
    ]);
  });

  it("uses agentic and coding tie-breakers during deduplication", async () => {
    const tiedRows = [
      { model: "Model X", agentic: 89.5, coding: 50.75 },
      { model: "Model X", agentic: 90, coding: 50 },
      { model: "Model Y", agentic: 85, coding: 60 },
    ];

    const clientWithFirstOrder = {
      getModels: vi.fn().mockResolvedValue(tiedRows),
    };

    const clientWithReversedOrder = {
      getModels: vi.fn().mockResolvedValue([tiedRows[1], tiedRows[0], tiedRows[2]]),
    };

    const serviceA = new ModelRankingService(clientWithFirstOrder as never);
    const serviceB = new ModelRankingService(clientWithReversedOrder as never);

    const [rankingA, rankingB] = await Promise.all([serviceA.getRanking(), serviceB.getRanking()]);
    const modelXA = rankingA.find((entry) => entry.model === "Model X");
    const modelXB = rankingB.find((entry) => entry.model === "Model X");

    expect(modelXA).toEqual({ model: "Model X", index: 74, agentic: 90, coding: 50 });
    expect(modelXB).toEqual({ model: "Model X", index: 74, agentic: 90, coding: 50 });
    expect(rankingA).toEqual(rankingB);
  });

  it("limits ranking response to top 25 models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return {
        model: `Model ${rank}`,
        agentic: 100 - index,
        coding: 100 - index,
      };
    });

    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue(models),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(25);
    expect(ranking[0]).toMatchObject({ model: "Model 1", index: 100 });
    expect(ranking[24]).toMatchObject({ model: "Model 25", index: 76 });
  });
});

import { describe, expect, it, vi } from "vitest";
import { ModelRankingService } from "./model-ranking-service.js";

describe("ModelRankingService", () => {
  it("filters models without both scores and sorts by score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 50, coding: 50 },
        { model: "Model B", agentic: 80, coding: 40 },
        { model: "Model C", agentic: 90, coding: null },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model B", position: 1, relative: 100 },
      { model: "Model A", position: 2, relative: 78.13 },
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

  it("deduplicates by model and keeps highest score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 90, coding: 40 },
        { model: "Model A", agentic: 70, coding: 70 },
        { model: "Model B", agentic: 80, coding: 40 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relative: 100 },
      { model: "Model B", position: 2, relative: 91.43 },
    ]);
  });

  it("uses tie-breakers during deduplication", async () => {
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

    expect(modelXA).toEqual({ model: "Model X", position: 2, relative: 98.67 });
    expect(modelXB).toEqual({ model: "Model X", position: 2, relative: 98.67 });
    expect(rankingA).toEqual(rankingB);
  });

  it("rounds score to two decimals", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([{ model: "Model A", agentic: 80.123, coding: 40.456 }]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relative: 100 },
    ]);
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
    expect(ranking[0]).toMatchObject({ model: "Model 1", position: 1, relative: 100 });
    expect(ranking[24]).toMatchObject({ model: "Model 25", position: 25, relative: 76 });
  });

  it("returns numeric relative values when top score is zero", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 0, coding: 0 },
        { model: "Model B", agentic: 0, coding: 0 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relative: 100 },
      { model: "Model B", position: 2, relative: 100 },
    ]);
  });

  it("sets relative to zero for negative scores when top score is zero", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 0, coding: 0 },
        { model: "Model B", agentic: -10, coding: -10 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relative: 100 },
      { model: "Model B", position: 2, relative: 0 },
    ]);
  });

  it("sorts by unrounded score before relative rounding", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 86.004, coding: 86.004 },
        { model: "Model B", agentic: 86, coding: 86 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0]).toMatchObject({ model: "Model A", position: 1, relative: 100 });
    expect(ranking[1]).toMatchObject({ model: "Model B", position: 2, relative: 100 });
  });
});

import { describe, expect, it, vi } from "vitest";
import { ModelRankingService } from "./model-ranking-service.js";

describe("ModelRankingService", () => {
  it("filters models without both scores and sorts by score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 50, coding: 50, inputPrice: 0.25, outputPrice: 0.75 },
        { model: "Model B", agentic: 80, coding: 40, inputPrice: 0.1, outputPrice: 0.2 },
        { model: "Model C", agentic: 90, coding: null, inputPrice: 0.15, outputPrice: 0.6 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model B",
        position: 1,
        relativeScore: 100,
        relativePrice: 100,
      },
      {
        model: "Model A",
        position: 2,
        relativeScore: 78,
        relativePrice: 263,
      },
    ]);
  });

  it("throws when no model has both scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: null, coding: 50, inputPrice: null, outputPrice: null },
        { model: "Model B", agentic: 80, coding: null, inputPrice: null, outputPrice: null },
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
        { model: "Model A", agentic: 90, coding: 40, inputPrice: 0.2, outputPrice: 0.4 },
        { model: "Model A", agentic: 70, coding: 70, inputPrice: 0.5, outputPrice: 1.5 },
        { model: "Model B", agentic: 80, coding: 40, inputPrice: 0.1, outputPrice: 0.2 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        relativeScore: 100,
        relativePrice: 100,
      },
      {
        model: "Model B",
        position: 2,
        relativeScore: 91,
        relativePrice: 50,
      },
    ]);
  });

  it("uses tie-breakers during deduplication", async () => {
    const tiedRows = [
      { model: "Model X", agentic: 89.5, coding: 50.75, inputPrice: 0.1, outputPrice: 0.2 },
      { model: "Model X", agentic: 90, coding: 50, inputPrice: 0.3, outputPrice: 0.4 },
      { model: "Model Y", agentic: 85, coding: 60, inputPrice: 0.5, outputPrice: 0.6 },
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

    expect(modelXA).toEqual({
      model: "Model X",
      position: 2,
      relativeScore: 99,
      relativePrice: 61,
    });
    expect(modelXB).toEqual({
      model: "Model X",
      position: 2,
      relativeScore: 99,
      relativePrice: 61,
    });
    expect(rankingA).toEqual(rankingB);
  });

  it("rounds relative score to integer", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          model: "Model A",
          agentic: 80.123,
          coding: 40.456,
          inputPrice: 0.15,
          outputPrice: 0.6,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        relativeScore: 100,
        relativePrice: 100,
      },
    ]);
  });

  it("limits ranking response to top 25 models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return {
        model: `Model ${rank}`,
        agentic: 100 - index,
        coding: 100 - index,
        inputPrice: 0.5,
        outputPrice: 1.25,
      };
    });

    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue(models),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(25);
    expect(ranking[0]).toMatchObject({
      model: "Model 1",
      position: 1,
      relativeScore: 100,
      relativePrice: 100,
    });
    expect(ranking[24]).toMatchObject({
      model: "Model 25",
      position: 25,
      relativeScore: 76,
      relativePrice: 100,
    });
  });

  it("returns formatted relative values when top score is zero", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 0, coding: 0, inputPrice: null, outputPrice: null },
        { model: "Model B", agentic: 0, coding: 0, inputPrice: 0.15, outputPrice: 0.6 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relativeScore: 100, relativePrice: null },
      { model: "Model B", position: 2, relativeScore: 100, relativePrice: null },
    ]);
  });

  it("sets relative to zero for negative scores when top score is zero", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 0, coding: 0, inputPrice: null, outputPrice: null },
        { model: "Model B", agentic: -10, coding: -10, inputPrice: 0.2, outputPrice: 0.4 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { model: "Model A", position: 1, relativeScore: 100, relativePrice: null },
      { model: "Model B", position: 2, relativeScore: 0, relativePrice: null },
    ]);
  });

  it("sorts by unrounded score before relative rounding", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 86.004, coding: 86.004, inputPrice: 0.1, outputPrice: 0.2 },
        { model: "Model B", agentic: 86, coding: 86, inputPrice: null, outputPrice: null },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0]).toMatchObject({
      model: "Model A",
      position: 1,
      relativeScore: 100,
      relativePrice: 100,
    });
    expect(ranking[1]).toMatchObject({
      model: "Model B",
      position: 2,
      relativeScore: 100,
      relativePrice: null,
    });
  });

  it("returns null relativePrice when top model has zero price baseline", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        { model: "Model A", agentic: 100, coding: 100, inputPrice: 0, outputPrice: 0 },
        { model: "Model B", agentic: 90, coding: 90, inputPrice: 0.5, outputPrice: 1 },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      { position: 1, model: "Model A", relativeScore: 100, relativePrice: null },
      { position: 2, model: "Model B", relativeScore: 90, relativePrice: null },
    ]);
  });
});

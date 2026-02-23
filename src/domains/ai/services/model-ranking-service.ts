import { AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const AGENTIC_WEIGHT = 0.6;
const CODING_WEIGHT = 0.4;
const RANKING_LIMIT = 25;

function roundScore(value: number): number {
  return Number(value.toFixed(3));
}

function hasBothScores(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & { agentic: number; coding: number } {
  return model.agentic !== null && model.coding !== null;
}

function compareRankedModels(left: RankedModel, right: RankedModel): number {
  if (right.index !== left.index) return right.index - left.index;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  return right.coding - left.coding;
}

export class ModelRankingService {
  private artificialAnalysisClient;

  constructor(artificialAnalysisClient: Pick<ArtificialAnalysisClient, "getModels">) {
    this.artificialAnalysisClient = artificialAnalysisClient;
  }

  async getRanking(): Promise<RankedModel[]> {
    const models = await this.artificialAnalysisClient.getModels();

    const scoredModels = models.filter(hasBothScores).map((model) => {
      const index = roundScore(model.agentic * AGENTIC_WEIGHT + model.coding * CODING_WEIGHT);

      return {
        model: model.model,
        index,
        agentic: model.agentic,
        coding: model.coding,
      };
    });

    const bestByModel = new Map<string, RankedModel>();
    for (const candidate of scoredModels) {
      const existing = bestByModel.get(candidate.model);
      if (!existing || compareRankedModels(candidate, existing) < 0) {
        bestByModel.set(candidate.model, candidate);
      }
    }

    const rankedModels = Array.from(bestByModel.values())
      .sort(compareRankedModels)
      .slice(0, RANKING_LIMIT);

    if (rankedModels.length === 0) {
      throw new AiParseError("No models with both agentic and coding scores were found");
    }

    return rankedModels;
  }
}

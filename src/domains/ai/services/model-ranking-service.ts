import { AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const AGENTIC_WEIGHT = 0.6;
const CODING_WEIGHT = 0.4;
const RANKING_LIMIT = 25;

function roundScore(value: number): number {
  return Number(value.toFixed(2));
}

function hasBothScores(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & { agentic: number; coding: number } {
  return model.agentic !== null && model.coding !== null;
}

interface ScoredModel {
  model: string;
  score: number;
  agentic: number;
  coding: number;
}

function compareScoredModels(left: ScoredModel, right: ScoredModel): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  return right.coding - left.coding;
}

function toRelativeScore(score: number, topScore: number): number {
  if (topScore === 0) return score === 0 ? 100 : 0;
  return roundScore((score / topScore) * 100);
}

export class ModelRankingService {
  private artificialAnalysisClient;

  constructor(artificialAnalysisClient: Pick<ArtificialAnalysisClient, "getModels">) {
    this.artificialAnalysisClient = artificialAnalysisClient;
  }

  async getRanking(): Promise<RankedModel[]> {
    const models = await this.artificialAnalysisClient.getModels();

    const scoredModels: ScoredModel[] = models.filter(hasBothScores).map((model) => {
      const score = model.agentic * AGENTIC_WEIGHT + model.coding * CODING_WEIGHT;

      return {
        model: model.model,
        score,
        agentic: model.agentic,
        coding: model.coding,
      };
    });

    const bestByModel = new Map<string, ScoredModel>();
    for (const candidate of scoredModels) {
      const existing = bestByModel.get(candidate.model);
      if (!existing || compareScoredModels(candidate, existing) < 0) {
        bestByModel.set(candidate.model, candidate);
      }
    }

    const rankedModels = Array.from(bestByModel.values())
      .sort(compareScoredModels)
      .slice(0, RANKING_LIMIT);

    if (rankedModels.length === 0) {
      throw new AiParseError("No models with both agentic and coding scores were found");
    }

    const topScore = rankedModels[0].score;

    return rankedModels.map((entry, index) => ({
      model: entry.model,
      position: index + 1,
      relative: toRelativeScore(entry.score, topScore),
    }));
  }
}

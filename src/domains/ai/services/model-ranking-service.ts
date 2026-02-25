import { AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const WEIGHT_INTELLIGENCE_AGENTIC = 0.7;
const WEIGHT_INTELLIGENCE_CODING = 0.3;

const WEIGHT_FINAL_INTELLIGENCE = 0.8;
const WEIGHT_FINAL_EFFICIENCY = 0.2;

const RANKING_LIMIT = 20;

function hasRequiredFields(model: ArtificialAnalysisModel): model is ArtificialAnalysisModel & {
  slug: string;
  reasoningModel: true;
  coding: number;
  agentic: number;
  blendedPrice: number;
} {
  return (
    model.slug.length > 0 &&
    model.reasoningModel === true &&
    model.coding !== null &&
    model.agentic !== null &&
    model.blendedPrice !== null &&
    model.blendedPrice > 0
  );
}

interface ScoredModel {
  slug: string;
  model: string;
  baseScore: number;
  efficiency: number;
  coding: number;
  agentic: number;
  blendedPrice: number;
}

function toEfficiency(baseScore: number, price: number): number {
  if (baseScore <= 0) return 0;
  return baseScore / Math.sqrt(price);
}

function toRelativePercentValue(value: number, topValue: number): number {
  if (!Number.isFinite(topValue)) {
    return Number.isFinite(value) ? 0 : 100;
  }

  if (topValue === 0) {
    return value === 0 ? 100 : 0;
  }

  return (value / topValue) * 100;
}

function toPercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * percentile)];
}

function compareFinalModels(
  left: ScoredModel & { score: number },
  right: ScoredModel & { score: number },
): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.coding !== left.coding) return right.coding - left.coding;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  if (left.blendedPrice !== right.blendedPrice) return left.blendedPrice - right.blendedPrice;
  return left.model.localeCompare(right.model);
}

export class ModelRankingService {
  private artificialAnalysisClient;

  constructor(artificialAnalysisClient: Pick<ArtificialAnalysisClient, "getModels">) {
    this.artificialAnalysisClient = artificialAnalysisClient;
  }

  async getRanking(): Promise<RankedModel[]> {
    const models = await this.artificialAnalysisClient.getModels();

    const scoredModels: ScoredModel[] = models.filter(hasRequiredFields).map((model) => {
      const baseScore =
        model.coding * WEIGHT_INTELLIGENCE_CODING + model.agentic * WEIGHT_INTELLIGENCE_AGENTIC;
      const efficiency = toEfficiency(baseScore, model.blendedPrice);

      return {
        slug: model.slug,
        model: model.model,
        baseScore,
        efficiency,
        coding: model.coding,
        agentic: model.agentic,
        blendedPrice: model.blendedPrice,
      };
    });

    if (scoredModels.length === 0) {
      throw new AiParseError(
        "No reasoning models with slug, coding, agentic, and blended price were found",
      );
    }

    const efficiency = toPercentile(
      scoredModels.map((m) => m.efficiency),
      0.85,
    );

    const finalScoredModels = scoredModels.map((entry) => {
      const relativeEfficiency = Math.min(
        toRelativePercentValue(entry.efficiency, efficiency),
        100,
      );
      const scoreMultiplier =
        WEIGHT_FINAL_INTELLIGENCE + WEIGHT_FINAL_EFFICIENCY * (relativeEfficiency / 100);
      const score = entry.baseScore * scoreMultiplier;

      return { ...entry, score };
    });

    const rankedModels = finalScoredModels.sort(compareFinalModels).slice(0, RANKING_LIMIT);

    return rankedModels.map((entry, index) => ({
      model: entry.model,
      position: index + 1,
      score: Number(entry.score.toFixed(2)),
      price1m: Math.round(entry.blendedPrice * 100) / 100,
    }));
  }
}

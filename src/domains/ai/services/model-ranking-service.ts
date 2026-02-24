import { AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const AGENTIC_WEIGHT = 0.6;
const CODING_WEIGHT = 0.4;
const VALUE_SCORE_WEIGHT = 0.8;
const VALUE_PRICE_WEIGHT = 0.2;
const RANKING_LIMIT = 25;

function hasRequiredFields(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & { coding: number; agentic: number; blendedPrice: number } {
  return model.coding !== null && model.agentic !== null && model.blendedPrice !== null;
}

interface ScoredModel {
  model: string;
  score: number;
  coding: number;
  agentic: number;
  blendedPrice: number;
}

interface RankedModelWithValue {
  position: number;
  model: string;
  score: number;
  price: number | null;
  valueScore: number | null;
}

function compareScoredModels(left: ScoredModel, right: ScoredModel): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.coding !== left.coding) return right.coding - left.coding;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  if (left.blendedPrice !== right.blendedPrice) return left.blendedPrice - right.blendedPrice;
  return left.model.localeCompare(right.model);
}

function toRelativePercentValue(value: number, topValue: number): number {
  if (topValue === 0) {
    return value === 0 ? 100 : 0;
  }

  return (value / topValue) * 100;
}

function toRoundedRelative(value: number, topValue: number): number {
  return Math.round(toRelativePercentValue(value, topValue));
}

function toRelativePrice(blendedPrice: number, topBlendedPrice: number): number | null {
  if (!Number.isFinite(blendedPrice) || !Number.isFinite(topBlendedPrice)) {
    return null;
  }

  if (topBlendedPrice === 0) {
    return null;
  }

  return Math.round(toRelativePercentValue(blendedPrice, topBlendedPrice));
}

function toValueScore(relativeScore: number, relativePrice: number | null): number | null {
  if (typeof relativePrice !== "number" || !Number.isFinite(relativePrice) || relativePrice <= 0) {
    return null;
  }

  return relativeScore * VALUE_SCORE_WEIGHT + (100 - relativePrice) * VALUE_PRICE_WEIGHT;
}

function toPercentageText(value: number): string {
  return `${value}%`;
}

function compareRankedModelsByValue(
  left: RankedModelWithValue,
  right: RankedModelWithValue,
): number {
  const leftValue = left.valueScore;
  const rightValue = right.valueScore;
  const leftHasValue = leftValue !== null;
  const rightHasValue = rightValue !== null;

  if (leftValue !== null && rightValue !== null && leftValue !== rightValue) {
    return rightValue - leftValue;
  }

  if (leftHasValue !== rightHasValue) {
    return leftHasValue ? -1 : 1;
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  const leftPrice = left.price;
  const rightPrice = right.price;
  const leftHasPrice = typeof leftPrice === "number" && Number.isFinite(leftPrice);
  const rightHasPrice = typeof rightPrice === "number" && Number.isFinite(rightPrice);

  if (leftHasPrice && rightHasPrice && leftPrice !== rightPrice) {
    return leftPrice - rightPrice;
  }

  if (leftHasPrice !== rightHasPrice) {
    return leftHasPrice ? -1 : 1;
  }

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
      const score = model.coding * CODING_WEIGHT + model.agentic * AGENTIC_WEIGHT;

      return {
        model: model.model,
        score,
        coding: model.coding,
        agentic: model.agentic,
        blendedPrice: model.blendedPrice,
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
      throw new AiParseError("No models with coding, agentic, and blended price were found");
    }

    const topScore = rankedModels[0].score;
    const topBlendedPrice = rankedModels[0].blendedPrice;

    const rankedByValue = rankedModels
      .map((entry) => {
        const relativeScore = toRoundedRelative(entry.score, topScore);
        const relativePrice = toRelativePrice(entry.blendedPrice, topBlendedPrice);

        return {
          position: 0,
          model: entry.model,
          score: relativeScore,
          price: relativePrice,
          valueScore: toValueScore(relativeScore, relativePrice),
        } satisfies RankedModelWithValue;
      })
      .sort(compareRankedModelsByValue);

    return rankedByValue.map(({ valueScore: _valueScore, ...entry }, index) => ({
      position: index + 1,
      model: entry.model,
      score: toPercentageText(entry.score),
      price: entry.price === null ? null : toPercentageText(entry.price),
    }));
  }
}

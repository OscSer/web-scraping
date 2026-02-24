import { AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const CODING_WEIGHT = 0.5;
const AGENTIC_WEIGHT = 0.5;
const INPUT_PRICE_WEIGHT = 0.85;
const OUTPUT_PRICE_WEIGHT = 0.15;
const VALUE_SCORE_WEIGHT = 0.8;
const VALUE_PRICE_WEIGHT = 0.2;
const RANKING_LIMIT = 25;

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
  inputPrice: number | null;
  outputPrice: number | null;
}

interface RankedModelWithValue extends RankedModel {
  valueScore: number | null;
}

function compareScoredModels(left: ScoredModel, right: ScoredModel): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  return right.coding - left.coding;
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

function toRelativePrice(
  inputPrice: number | null,
  outputPrice: number | null,
  topInputPrice: number | null,
  topOutputPrice: number | null,
): number | null {
  if (
    typeof inputPrice !== "number" ||
    !Number.isFinite(inputPrice) ||
    typeof outputPrice !== "number" ||
    !Number.isFinite(outputPrice) ||
    typeof topInputPrice !== "number" ||
    !Number.isFinite(topInputPrice) ||
    typeof topOutputPrice !== "number" ||
    !Number.isFinite(topOutputPrice)
  ) {
    return null;
  }

  if (topInputPrice === 0 || topOutputPrice === 0) {
    return null;
  }

  const inputRelative = toRelativePercentValue(inputPrice, topInputPrice);
  const outputRelative = toRelativePercentValue(outputPrice, topOutputPrice);
  const compositeRelative =
    inputRelative * INPUT_PRICE_WEIGHT + outputRelative * OUTPUT_PRICE_WEIGHT;

  return Math.round(compositeRelative);
}

function toValueScore(relativeScore: number, relativePrice: number | null): number | null {
  if (typeof relativePrice !== "number" || !Number.isFinite(relativePrice) || relativePrice <= 0) {
    return null;
  }

  return relativeScore * VALUE_SCORE_WEIGHT + (100 - relativePrice) * VALUE_PRICE_WEIGHT;
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

    const scoredModels: ScoredModel[] = models.filter(hasBothScores).map((model) => {
      const score = model.agentic * AGENTIC_WEIGHT + model.coding * CODING_WEIGHT;

      return {
        model: model.model,
        score,
        agentic: model.agentic,
        coding: model.coding,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
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
    const topInputPrice = rankedModels[0].inputPrice;
    const topOutputPrice = rankedModels[0].outputPrice;

    const rankedByValue = rankedModels
      .map((entry) => {
        const relativeScore = toRoundedRelative(entry.score, topScore);
        const relativePrice = toRelativePrice(
          entry.inputPrice,
          entry.outputPrice,
          topInputPrice,
          topOutputPrice,
        );

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
      score: entry.score,
      price: entry.price,
    }));
  }
}

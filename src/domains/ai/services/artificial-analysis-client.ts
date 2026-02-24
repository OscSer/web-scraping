import type { FastifyBaseLogger } from "fastify";
import { buildFetchHeaders, fetchWithTimeout } from "../../../shared/utils/api-helpers.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { AiFetchError, AiParseError } from "../types/errors.js";
import { ArtificialAnalysisModel } from "../types/ranking.js";

const ARTIFICIAL_ANALYSIS_URL = "https://artificialanalysis.ai/";
const ARTIFICIAL_ANALYSIS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ARTIFICIAL_ANALYSIS_CACHE_KEY = "ai:artificial-analysis:models:v2";
const NEXT_FLIGHT_CHUNK_PATTERN =
  'self\\.__next_f\\.push\\(\\[\\s*\\d+\\s*,\\s*"((?:\\\\.|[^"\\\\])*)"';
const MODELS_KEY_PATTERN = '"models"\\s*:\\s*\\[';

interface RawArtificialAnalysisModel {
  short_name?: string;
  model_name?: string;
  name?: string;
  agentic_index?: number;
  coding_index?: number;
  price_1m_input_tokens?: number;
  price_1m_output_tokens?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function extractJsonArrayText(source: string, arrayStartIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStartIndex; index < source.length; index++) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(arrayStartIndex, index + 1);
      }
    }
  }

  return null;
}

function extractNextFlightPayloadChunks(html: string): string[] {
  const chunks: string[] = [];
  const chunkRegex = new RegExp(NEXT_FLIGHT_CHUNK_PATTERN, "g");

  let chunkMatch: RegExpExecArray | null = null;
  while ((chunkMatch = chunkRegex.exec(html)) !== null) {
    const rawChunk = chunkMatch[1] ?? "";
    try {
      chunks.push(JSON.parse(`"${rawChunk}"`) as string);
    } catch {
      // Ignore malformed chunks and continue scanning.
    }
  }

  return chunks;
}

function normalizeModel(rawModel: RawArtificialAnalysisModel): ArtificialAnalysisModel | null {
  const name = rawModel.short_name ?? rawModel.model_name ?? rawModel.name;
  if (!name || name.trim().length === 0) return null;

  return {
    model: name.trim(),
    agentic: isFiniteNumber(rawModel.agentic_index) ? rawModel.agentic_index : null,
    coding: isFiniteNumber(rawModel.coding_index) ? rawModel.coding_index : null,
    inputPrice: isFiniteNumber(rawModel.price_1m_input_tokens)
      ? rawModel.price_1m_input_tokens
      : null,
    outputPrice: isFiniteNumber(rawModel.price_1m_output_tokens)
      ? rawModel.price_1m_output_tokens
      : null,
  };
}

function extractModelsFromChunk(decodedChunk: string): ArtificialAnalysisModel[][] {
  const modelSets: ArtificialAnalysisModel[][] = [];
  const modelsKeyRegex = new RegExp(MODELS_KEY_PATTERN, "g");

  let modelKeyMatch: RegExpExecArray | null = null;
  while ((modelKeyMatch = modelsKeyRegex.exec(decodedChunk)) !== null) {
    const arrayStartIndex = modelKeyMatch.index + modelKeyMatch[0].length - 1;
    const arrayText = extractJsonArrayText(decodedChunk, arrayStartIndex);

    if (!arrayText) {
      continue;
    }

    try {
      const parsed = JSON.parse(arrayText) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }

      const models = parsed
        .filter((entry): entry is RawArtificialAnalysisModel => {
          return !!entry && typeof entry === "object";
        })
        .map(normalizeModel)
        .filter((entry): entry is ArtificialAnalysisModel => entry !== null);

      if (models.length > 0) {
        modelSets.push(models);
      }
    } catch {
      // Ignore malformed model arrays and continue scanning.
    }
  }

  return modelSets;
}

function countModelsWithBothScores(models: ArtificialAnalysisModel[]): number {
  return models.filter((model) => model.agentic !== null && model.coding !== null).length;
}

function pickBestModelSet(modelSets: ArtificialAnalysisModel[][]): ArtificialAnalysisModel[] {
  let bestSet: ArtificialAnalysisModel[] = [];
  let bestBothScoresCount = -1;

  for (const modelSet of modelSets) {
    const currentBothScoresCount = countModelsWithBothScores(modelSet);
    const hasBetterCoverage = currentBothScoresCount > bestBothScoresCount;
    const hasSameCoverageButMoreModels =
      currentBothScoresCount === bestBothScoresCount && modelSet.length > bestSet.length;

    if (hasBetterCoverage || hasSameCoverageButMoreModels) {
      bestSet = modelSet;
      bestBothScoresCount = currentBothScoresCount;
    }
  }

  return bestSet;
}

function parseModelsFromHtml(html: string): ArtificialAnalysisModel[] {
  const payloadChunks = extractNextFlightPayloadChunks(html);
  if (payloadChunks.length === 0) {
    throw new AiParseError("Unable to locate Next.js flight payload");
  }

  const modelSets = payloadChunks.flatMap((chunk) => extractModelsFromChunk(chunk));
  if (modelSets.length === 0) {
    throw new AiParseError("Unable to locate models data in payload");
  }

  const bestModelSet = pickBestModelSet(modelSets);
  if (bestModelSet.length === 0) {
    throw new AiParseError("Models data is empty");
  }

  return bestModelSet;
}

export class ArtificialAnalysisClient {
  private modelsCache;

  constructor(logger: FastifyBaseLogger) {
    this.modelsCache = createCache<ArtificialAnalysisModel[]>(
      ARTIFICIAL_ANALYSIS_CACHE_TTL_MS,
      logger,
    );
  }

  async getModels(): Promise<ArtificialAnalysisModel[]> {
    return this.modelsCache.getOrFetch(ARTIFICIAL_ANALYSIS_CACHE_KEY, async () => {
      const response = await fetchWithTimeout(ARTIFICIAL_ANALYSIS_URL, {
        headers: buildFetchHeaders({
          accept: "text/html,application/xhtml+xml",
        }),
      });

      if (!response.ok) {
        throw new AiFetchError(
          "Failed to fetch Artificial Analysis page",
          response.status,
          response.statusText,
        );
      }

      const html = await response.text();
      return parseModelsFromHtml(html);
    });
  }
}

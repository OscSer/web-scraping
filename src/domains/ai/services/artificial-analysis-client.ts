import type { FastifyBaseLogger } from "fastify";
import { buildFetchHeaders, fetchWithTimeout } from "../../../shared/utils/api-helpers.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { AiFetchError, AiParseError } from "../types/errors.js";
import {
  type ArtificialAnalysisModel,
  type PerformanceData,
  type RawArtificialAnalysisModel,
} from "../types/ranking.js";

const ARTIFICIAL_ANALYSIS_URL = "https://artificialanalysis.ai/";
const ARTIFICIAL_ANALYSIS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ARTIFICIAL_ANALYSIS_CACHE_KEY = "ai:models";
const NEXT_FLIGHT_CHUNK_PATTERN =
  'self\\.__next_f\\.push\\(\\[\\s*\\d+\\s*,\\s*"((?:\\\\.|[^"\\\\])*)"';
const MODELS_KEY_PATTERN = '"models"\\s*:\\s*\\[';
const PERFORMANCE_DATA_PATTERN = '"coding_index"\\s*:';

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

function extractJsonObjectText(source: string, objectStartIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStartIndex; index < source.length; index++) {
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

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(objectStartIndex, index + 1);
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
  const slug = typeof rawModel.slug === "string" ? rawModel.slug.trim() : "";
  if (slug.length === 0) return null;

  return {
    slug,
    model: name.trim(),
    reasoningModel: rawModel.reasoning_model === true || rawModel.isReasoning === true,
    agentic: isFiniteNumber(rawModel.agentic_index) ? rawModel.agentic_index : null,
    coding: isFiniteNumber(rawModel.coding_index) ? rawModel.coding_index : null,
    blendedPrice: isFiniteNumber(rawModel.price_1m_blended_3_to_1)
      ? rawModel.price_1m_blended_3_to_1
      : null,
    inputPrice: isFiniteNumber(rawModel.price_1m_input_tokens)
      ? rawModel.price_1m_input_tokens
      : null,
    outputPrice: isFiniteNumber(rawModel.price_1m_output_tokens)
      ? rawModel.price_1m_output_tokens
      : null,
  };
}

function extractModelsFromModelsArray(decodedChunk: string): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
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

      const chunkModels = parsed
        .filter((entry): entry is RawArtificialAnalysisModel => {
          return !!entry && typeof entry === "object";
        })
        .map(normalizeModel)
        .filter((entry): entry is ArtificialAnalysisModel => entry !== null);

      models.push(...chunkModels);
    } catch {
      // Ignore malformed model arrays and continue scanning.
    }
  }

  return models;
}

function extractPerformanceDataFromChunk(decodedChunk: string): PerformanceData[] {
  const models: PerformanceData[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match: RegExpExecArray | null = null;
  while ((match = performanceRegex.exec(decodedChunk)) !== null) {
    // Find the start of the containing object by backtracking to find the opening brace
    let objectStartIndex = match.index;
    let braceCount = 0;
    for (let i = match.index; i >= 0; i--) {
      if (decodedChunk[i] === "}") braceCount++;
      if (decodedChunk[i] === "{") {
        if (braceCount === 0) {
          objectStartIndex = i;
          break;
        }
        braceCount--;
      }
    }

    const objectText = extractJsonObjectText(decodedChunk, objectStartIndex);
    if (!objectText) {
      continue;
    }

    try {
      const parsed = JSON.parse(objectText) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        continue;
      }

      const raw = parsed as RawArtificialAnalysisModel;
      const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
      if (slug.length === 0) continue;

      models.push({
        slug,
        coding: isFiniteNumber(raw.coding_index) ? raw.coding_index : null,
        agentic: isFiniteNumber(raw.agentic_index) ? raw.agentic_index : null,
        blendedPrice: isFiniteNumber(raw.price_1m_blended_3_to_1)
          ? raw.price_1m_blended_3_to_1
          : null,
        inputPrice: isFiniteNumber(raw.price_1m_input_tokens) ? raw.price_1m_input_tokens : null,
        outputPrice: isFiniteNumber(raw.price_1m_output_tokens) ? raw.price_1m_output_tokens : null,
      });
    } catch {
      // Ignore malformed objects and continue scanning.
    }
  }

  return models;
}

function mergeModelData(
  metadataModels: ArtificialAnalysisModel[],
  performanceData: PerformanceData[],
): ArtificialAnalysisModel[] {
  const performanceBySlug = new Map<string, PerformanceData>();

  for (const perf of performanceData) {
    performanceBySlug.set(perf.slug, perf);
  }

  return metadataModels.map((metaModel) => {
    const perf = performanceBySlug.get(metaModel.slug);
    if (!perf) {
      return metaModel;
    }

    return {
      ...metaModel,
      coding: perf.coding ?? metaModel.coding,
      agentic: perf.agentic ?? metaModel.agentic,
      blendedPrice: perf.blendedPrice ?? metaModel.blendedPrice,
      inputPrice: perf.inputPrice ?? metaModel.inputPrice,
      outputPrice: perf.outputPrice ?? metaModel.outputPrice,
    };
  });
}

function parseModelsFromHtml(html: string): ArtificialAnalysisModel[] {
  const payloadChunks = extractNextFlightPayloadChunks(html);
  if (payloadChunks.length === 0) {
    throw new AiParseError("Unable to locate Next.js flight payload");
  }

  // Collect all metadata models (from "models" arrays) and performance data separately
  const metadataModels: ArtificialAnalysisModel[] = [];
  const performanceData: PerformanceData[] = [];

  for (const chunk of payloadChunks) {
    const chunkMetadata = extractModelsFromModelsArray(chunk);
    const chunkPerformance = extractPerformanceDataFromChunk(chunk);

    metadataModels.push(...chunkMetadata);
    performanceData.push(...chunkPerformance);
  }

  // If we have both metadata and performance data, merge them
  let finalModels: ArtificialAnalysisModel[];
  if (metadataModels.length > 0 && performanceData.length > 0) {
    finalModels = mergeModelData(metadataModels, performanceData);
  } else if (metadataModels.length > 0) {
    finalModels = metadataModels;
  } else {
    throw new AiParseError("Unable to locate models data in payload");
  }

  if (finalModels.length === 0) {
    throw new AiParseError("Models data is empty");
  }

  return finalModels;
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

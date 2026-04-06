import { describe, expect, it, vi } from "vitest";
import {
  createApiHelpersMocks,
  createPassthroughCacheGetOrFetchMock,
} from "../../../shared/test-utils/service-test-helpers.js";

interface HtmlPayloadOptions {
  channel?: number;
  spacedPushFormat?: boolean;
  spacedModelsKey?: boolean;
}

function buildHtmlWithModels(models: unknown[], options: HtmlPayloadOptions = {}): string {
  const { channel = 1, spacedPushFormat = false, spacedModelsKey = false } = options;

  const decodedChunk = spacedModelsKey
    ? `b:{"models" : ${JSON.stringify(models)}}`
    : `b:${JSON.stringify({ models })}`;
  const encodedChunk = JSON.stringify(decodedChunk).slice(1, -1);

  if (spacedPushFormat) {
    return `<html><body><script>self.__next_f.push([ ${channel} , "${encodedChunk}" ])</script></body></html>`;
  }

  return `<html><body><script>self.__next_f.push([${channel},"${encodedChunk}"])</script></body></html>`;
}

function encodeChunk(decodedChunk: string, channel: number): string {
  const encodedChunk = JSON.stringify(decodedChunk).slice(1, -1);
  return `<script>self.__next_f.push([${channel},"${encodedChunk}"])</script>`;
}

function buildHtmlWithSeparateChunks(
  metadataModels: unknown[],
  performanceModels: unknown[],
): string {
  // Metadata chunk (like chunk 31 from the actual site)
  const metadataChunk = `b:${JSON.stringify({ models: metadataModels })}`;

  // Build performance chunk with individual objects
  let performanceChunkContent = "b:";
  for (let i = 0; i < performanceModels.length; i++) {
    performanceChunkContent += JSON.stringify(performanceModels[i]);
    if (i < performanceModels.length - 1) {
      performanceChunkContent += ",";
    }
  }

  return `<html><body>
    ${encodeChunk(metadataChunk, 1)}
    ${encodeChunk(performanceChunkContent, 2)}
  </body></html>`;
}

interface LoadOptions {
  getOrFetchImpl?: (
    key: string,
    fetcher: () => Promise<
      Array<{
        model: string;
        agentic: number | null;
        coding: number | null;
        blendedPrice: number | null;
        inputPrice: number | null;
        outputPrice: number | null;
      }>
    >,
  ) => Promise<
    Array<{
      model: string;
      agentic: number | null;
      coding: number | null;
      blendedPrice: number | null;
      inputPrice: number | null;
      outputPrice: number | null;
    }>
  >;
}

async function loadArtificialAnalysisClient(options: LoadOptions = {}) {
  vi.resetModules();

  const getOrFetch = options.getOrFetchImpl
    ? vi.fn(options.getOrFetchImpl)
    : createPassthroughCacheGetOrFetchMock<
        Array<{
          model: string;
          agentic: number | null;
          coding: number | null;
          blendedPrice: number | null;
          inputPrice: number | null;
          outputPrice: number | null;
        }>
      >();

  const createCache = vi.fn().mockReturnValue({
    getOrFetch,
  });

  const { fetchWithTimeout, buildFetchHeaders } = createApiHelpersMocks();

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache,
  }));

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));

  const { ArtificialAnalysisClient } = await import("./artificial-analysis-client.js");

  return {
    ArtificialAnalysisClient,
    getOrFetch,
    fetchWithTimeout,
  };
}

describe("ArtificialAnalysisClient", () => {
  it("parses models from next flight payload", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout, getOrFetch } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "model-a",
        reasoning_model: true,
        short_name: "Model A",
        agentic_index: 75,
        coding_index: 62,
        price_1m_blended_3_to_1: 0.2625,
        price_1m_input_tokens: 0.15,
        price_1m_output_tokens: 0.6,
      },
      {
        slug: "model-b",
        isReasoning: false,
        model_name: "Model B",
        agentic_index: 68,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).resolves.toEqual([
      {
        slug: "model-a",
        model: "Model A",
        reasoningModel: true,
        agentic: 75,
        coding: 62,
        blendedPrice: 0.2625,
        inputPrice: 0.15,
        outputPrice: 0.6,
      },
      {
        slug: "model-b",
        model: "Model B",
        reasoningModel: false,
        agentic: 68,
        coding: null,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
      },
    ]);

    expect(getOrFetch).toHaveBeenCalledWith("ai:models", expect.any(Function));
  });

  it("parses models with variable channel and spacing", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels(
      [
        {
          slug: "model-c",
          reasoning_model: true,
          name: "Model C",
          agentic_index: 77,
          coding_index: 63,
          price_1m_blended_3_to_1: 1.5,
        },
      ],
      {
        channel: 9,
        spacedPushFormat: true,
        spacedModelsKey: true,
      },
    );

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).resolves.toEqual([
      {
        slug: "model-c",
        model: "Model C",
        reasoningModel: true,
        agentic: 77,
        coding: 63,
        blendedPrice: 1.5,
        inputPrice: null,
        outputPrice: null,
      },
    ]);
  });

  it("throws AiFetchError when page request fails", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 503, statusText: "Unavailable" }),
    );

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).rejects.toMatchObject({
      name: "AiFetchError",
    });
  });

  it("throws AiParseError when models cannot be found", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();
    fetchWithTimeout.mockResolvedValue(new Response("<html></html>", { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("parses models distributed across separate chunks", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();

    // Metadata models (like chunk 31) - no performance data
    const metadataModels = [
      {
        slug: "gpt-5-4-mini",
        name: "GPT-5.4 mini (xhigh)",
        shortName: "GPT-5.4 mini (xhigh)",
        isReasoning: true,
        creator: { name: "OpenAI", color: "#1f1f1f" },
      },
      {
        slug: "model-b",
        name: "Model B",
        isReasoning: false,
      },
    ];

    // Performance models (like chunk 14) - separate objects with performance data
    const performanceModels = [
      {
        slug: "gpt-5-4-mini",
        coding_index: 51.48,
        agentic_index: 55.66,
        price_1m_blended_3_to_1: 1.6875,
        price_1m_input_tokens: 0.75,
        price_1m_output_tokens: 4.5,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    // First model should have merged data
    expect(result).toContainEqual({
      slug: "gpt-5-4-mini",
      model: "GPT-5.4 mini (xhigh)",
      reasoningModel: true,
      coding: 51.48,
      agentic: 55.66,
      blendedPrice: 1.6875,
      inputPrice: 0.75,
      outputPrice: 4.5,
    });

    // Second model should have metadata but no performance data
    expect(result).toContainEqual({
      slug: "model-b",
      model: "Model B",
      reasoningModel: false,
      coding: null,
      agentic: null,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
    });
  });

  it("handles field name variations (isReasoning vs reasoning_model)", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "model-new",
        isReasoning: true, // New field name
        name: "Model with new fields", // New field name
        coding_index: 80,
        agentic_index: 75,
        price_1m_blended_3_to_1: 1.0,
      },
      {
        slug: "model-old",
        reasoning_model: false, // Old field name
        model_name: "Model with old fields", // Old field name
        coding_index: 70,
        agentic_index: 65,
        price_1m_blended_3_to_1: 2.0,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "model-new",
      model: "Model with new fields",
      reasoningModel: true,
      coding: 80,
      agentic: 75,
      blendedPrice: 1.0,
      inputPrice: null,
      outputPrice: null,
    });

    expect(result).toContainEqual({
      slug: "model-old",
      model: "Model with old fields",
      reasoningModel: false,
      coding: 70,
      agentic: 65,
      blendedPrice: 2.0,
      inputPrice: null,
      outputPrice: null,
    });
  });

  it("handles missing performance data gracefully", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } = await loadArtificialAnalysisClient();

    // Only metadata, no performance data
    const metadataModels = [
      {
        slug: "model-no-perf",
        name: "Model Without Performance Data",
        isReasoning: true,
      },
    ];

    const performanceModels: unknown[] = []; // Empty performance data

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    expect(result).toEqual([
      {
        slug: "model-no-perf",
        model: "Model Without Performance Data",
        reasoningModel: true,
        coding: null,
        agentic: null,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
      },
    ]);
  });
});

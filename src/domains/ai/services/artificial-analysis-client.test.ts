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
});

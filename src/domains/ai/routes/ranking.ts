import { FastifyPluginAsync } from "fastify";
import { ApiResponse } from "../../../shared/types/api.js";
import { sendError } from "../../../shared/utils/api-helpers.js";
import { ModelRankingService } from "../services/model-ranking-service.js";
import { RankedModel } from "../types/ranking.js";

interface RankingRoutesOptions {
  modelRankingService: ModelRankingService;
}

export const rankingRoutes: FastifyPluginAsync<RankingRoutesOptions> = async (fastify, opts) => {
  const { modelRankingService } = opts;

  fastify.get("/ranking", async (_request, reply) => {
    try {
      const ranking = await modelRankingService.getRanking();

      const response: ApiResponse<RankedModel[]> = {
        success: true,
        data: ranking,
      };

      await reply.code(200).send(response);
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching AI ranking");
      await sendError(reply, 502, "SCRAPING_ERROR", "Unable to fetch AI ranking");
    }
  });
};

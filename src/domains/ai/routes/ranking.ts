import { FastifyPluginAsync } from "fastify";
import { sendError } from "../../../shared/utils/api-helpers.js";
import { ModelRankingService } from "../services/model-ranking-service.js";

interface RankingRoutesOptions {
  modelRankingService: ModelRankingService;
}

export const rankingRoutes: FastifyPluginAsync<RankingRoutesOptions> = async (fastify, opts) => {
  const { modelRankingService } = opts;

  fastify.get("/ranking", async (_request, reply) => {
    try {
      const ranking = await modelRankingService.getRanking();

      await reply.code(200).send(ranking);
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching AI ranking");
      await sendError(reply, 502, "SCRAPING_ERROR", "Unable to fetch AI ranking");
    }
  });
};

import type { FastifyBaseLogger } from "fastify";
import { buildFetchHeaders, fetchWithTimeout } from "../../../shared/utils/api-helpers.js";
import { type RateLimiter, createRateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { handleSteamError } from "../utils/steam-error-handler.js";

interface SteamReviewsResponse {
  success: number;
  query_summary: {
    total_positive: number;
    total_reviews: number;
  };
}

interface SteamScore {
  score: number;
}

function calculateScore(data: SteamReviewsResponse): SteamScore | null {
  const { total_positive, total_reviews } = data.query_summary;

  if (!Number.isFinite(total_positive) || !Number.isFinite(total_reviews)) {
    return null;
  }

  if (total_reviews === 0) {
    return null;
  }

  const score = (total_positive / total_reviews) * 100;

  return {
    score: parseFloat(score.toFixed(2)),
  };
}

export class SteamReviewsApiClient {
  private logger: FastifyBaseLogger;
  private rateLimiter: RateLimiter;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.rateLimiter = createRateLimiter(10);
  }

  async getScoreByAppId(appId: string): Promise<SteamScore | null> {
    try {
      const url = `https://store.steampowered.com/appreviews/${appId}?json=1&filter=all&language=all&purchase_type=all&num_per_page=0`;

      const response = await this.rateLimiter(() =>
        fetchWithTimeout(url, {
          headers: buildFetchHeaders({
            Accept: "application/json",
          }),
        }),
      );

      if (!response.ok) {
        throw new SteamFetchError(
          `Failed to fetch Steam reviews API for app ${appId}`,
          response.status,
          response.statusText,
        );
      }

      const data = (await response.json()) as SteamReviewsResponse;

      if (data.success !== 1) {
        throw new SteamParseError(`Steam API returned success=${data.success} for app ${appId}`);
      }

      const score = calculateScore(data);

      if (!score) {
        throw new SteamParseError(`Failed to calculate score from Steam API data for app ${appId}`);
      }

      return score;
    } catch (error) {
      if (error instanceof SteamFetchError || error instanceof SteamParseError) {
        throw error;
      }
      return handleSteamError(this.logger, error, appId, "Steam Reviews API client", null);
    }
  }
}

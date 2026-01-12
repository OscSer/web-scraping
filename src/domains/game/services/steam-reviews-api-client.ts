import { InMemoryCache } from "../../../shared/utils/cache.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { logger } from "../../../shared/utils/logger.js";
import { globalRateLimiter } from "../../../shared/utils/global-rate-limiter.js";

const STEAM_API_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SteamReviewsResponse {
  success: number;
  query_summary: {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
}

interface SteamScore {
  score: number;
  totalReviews: number;
}

const steamApiCache = new InMemoryCache<SteamScore>(STEAM_API_CACHE_TTL_MS);

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
    totalReviews: total_reviews,
  };
}

export class SteamReviewsApiClient {
  async getScoreByAppId(appId: string): Promise<SteamScore | null> {
    const cacheKey = `steam-api-${appId}`;

    try {
      const result = await steamApiCache.getOrFetch(cacheKey, async () => {
        const url = `https://store.steampowered.com/appreviews/${appId}?json=1&filter=all&language=all&purchase_type=all&num_per_page=0`;

        const response = await globalRateLimiter(() =>
          fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.5",
            },
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
          throw new SteamParseError(
            `Steam API returned success=${data.success} for app ${appId}`,
          );
        }

        const score = calculateScore(data);

        if (!score) {
          throw new SteamParseError(
            `Failed to calculate score from Steam API data for app ${appId}`,
          );
        }

        return score;
      });

      return result;
    } catch (error) {
      if (
        error instanceof SteamFetchError ||
        error instanceof SteamParseError
      ) {
        throw error;
      }
      logger.error(
        { err: error, appId },
        "[Game] Unexpected error in Steam Reviews API client",
      );
      return null;
    }
  }
}

export const steamReviewsApiClient = new SteamReviewsApiClient();

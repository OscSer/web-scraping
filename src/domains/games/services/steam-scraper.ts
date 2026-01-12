import { InMemoryCache } from "../../../shared/utils/cache.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { logger } from "../../../shared/utils/logger.js";

const STEAM_CACHE_TTL_MS = 5 * 60 * 1000;

interface SteamScore {
  score: number;
  totalReviews: number;
}

const steamCache = new InMemoryCache<SteamScore>(STEAM_CACHE_TTL_MS);

function parseSteamHtml(html: string): SteamScore | null {
  const aggregateRatingMatch = html.match(
    /data-tooltip-html="([^"]+)"[^>]*itemprop="aggregateRating"/,
  );

  if (!aggregateRatingMatch) return null;

  const tooltip = aggregateRatingMatch[1];
  const percentMatch = tooltip.match(
    /(\d+)%\s+of\s+the\s+([\d,]+)\s+user\s+reviews/,
  );

  if (!percentMatch) return null;

  const score = parseFloat(percentMatch[1]);
  const totalReviews = parseInt(percentMatch[2].replace(/,/g, ""), 10);

  if (!Number.isFinite(score) || !Number.isFinite(totalReviews)) {
    return null;
  }

  return { score, totalReviews };
}

export class SteamScraper {
  async getScoreByAppId(appId: string): Promise<SteamScore | null> {
    const cacheKey = `steam-${appId}`;

    try {
      const result = await steamCache.getOrFetch(cacheKey, async () => {
        const url = `https://store.steampowered.com/app/${appId}/`;

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (!response.ok) {
          throw new SteamFetchError(
            `Failed to fetch Steam page for app ${appId}`,
            response.status,
            response.statusText,
          );
        }

        const html = await response.text();
        const parsed = parseSteamHtml(html);

        if (!parsed) {
          throw new SteamParseError(
            `Failed to parse Steam HTML for app ${appId}`,
          );
        }

        return parsed;
      });

      return result;
    } catch (error) {
      if (error instanceof SteamFetchError) {
        throw error;
      }
      logger.error(
        { err: error, appId },
        "[Games] Unexpected error in Steam scraper",
      );
      return null;
    }
  }
}

export const steamScraper = new SteamScraper();

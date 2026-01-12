import { InMemoryCache } from "../../../shared/utils/cache.js";
import { SteamDBFetchError, SteamDBParseError } from "../types/errors.js";
import { logger } from "../../../shared/utils/logger.js";

const STEAMDB_CACHE_TTL_MS = 5 * 60 * 1000;

interface SteamDBScore {
  score: number;
  totalReviews: number;
}

const steamDBCache = new InMemoryCache<SteamDBScore>(STEAMDB_CACHE_TTL_MS);

function parseSteamDBHtml(html: string): SteamDBScore | null {
  const ratingMatch = html.match(
    /<meta\s+itemprop="ratingValue"\s+content="([\d.]+)"/,
  );
  const reviewCountMatch = html.match(
    /<meta\s+itemprop="reviewCount"\s+content="(\d+)"/,
  );

  if (!ratingMatch || !reviewCountMatch) {
    return null;
  }

  const score = parseFloat(ratingMatch[1]);
  const totalReviews = parseInt(reviewCountMatch[1], 10);

  if (!Number.isFinite(score) || !Number.isFinite(totalReviews)) {
    return null;
  }

  return { score, totalReviews };
}

export class SteamDBScraper {
  async getScoreByAppId(appId: string): Promise<SteamDBScore | null> {
    const cacheKey = `steamdb-${appId}`;

    try {
      const result = await steamDBCache.getOrFetch(cacheKey, async () => {
        const url = `https://steamdb.info/app/${appId}/charts/`;

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Referer: "https://steamdb.info/",
          },
        });

        if (!response.ok) {
          throw new SteamDBFetchError(
            `Failed to fetch SteamDB page for app ${appId}`,
            response.status,
            response.statusText,
          );
        }

        const html = await response.text();
        const parsed = parseSteamDBHtml(html);

        if (!parsed) {
          throw new SteamDBParseError(
            `Failed to parse SteamDB HTML for app ${appId}`,
          );
        }

        return parsed;
      });

      return result;
    } catch (error) {
      if (error instanceof SteamDBFetchError) {
        throw error;
      }
      logger.error(
        { err: error, appId },
        "[Games] Unexpected error in SteamDB scraper",
      );
      return null;
    }
  }
}

export const steamDBScraper = new SteamDBScraper();

import pLimit from "p-limit";

const MAX_CONCURRENT_REQUESTS = 10;

export type RateLimiter = <T>(fn: () => Promise<T>) => Promise<T>;

export function createRateLimiter(): RateLimiter {
  return pLimit(MAX_CONCURRENT_REQUESTS);
}

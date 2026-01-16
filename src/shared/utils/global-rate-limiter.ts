import pLimit from "p-limit";

export type RateLimiter = <T>(fn: () => Promise<T>) => Promise<T>;

export function createRateLimiter(maxConcurrentRequests: number): RateLimiter {
  return pLimit(maxConcurrentRequests);
}

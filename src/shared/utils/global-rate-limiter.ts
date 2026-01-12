import pLimit from "p-limit";

// Global concurrency limit for external HTTP requests
const MAX_CONCURRENT_REQUESTS = 10;

export const globalRateLimiter = pLimit(MAX_CONCURRENT_REQUESTS);

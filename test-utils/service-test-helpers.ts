import { vi } from "vitest";

export function createApiHelpersMocks() {
  const fetchWithTimeout = vi.fn();
  const buildFetchHeaders = vi
    .fn()
    .mockImplementation((headers?: Record<string, string>) => headers ?? {});

  return {
    fetchWithTimeout,
    buildFetchHeaders,
  };
}

export function createPassthroughCacheGetOrFetchMock<T>() {
  return vi.fn(async (_key: string, fetcher: () => Promise<T>) => fetcher());
}

export function createPassthroughRateLimiterMock() {
  return vi.fn(async (fn: () => Promise<unknown>) => fn());
}

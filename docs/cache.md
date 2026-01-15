# Cache

## Pattern

- Interface-based abstraction: `Cache<T>`
- Factory function: `createCache()` selects implementation based on config
- Multiple implementations: `UpstashCache` (production), `NoOpCache` (disabled)
- Request coalescing prevents stampeding herd problem

## Architecture

### Interface (`src/shared/types/cache.ts`)

```
get(key): Promise<T | null>
set(key, data): Promise<void>
getOrFetch(key, fetcher): Promise<T>
```

Small, focused interface with single responsibility.

### Factory (`src/shared/utils/cache-factory.ts`)

- `createCache<T>(ttlMs, logger): Cache<T>`
- Returns `NoOpCache` if `config.cache.isDisabled`
- Returns `UpstashCache` if cache enabled
- Creates child logger with `[Cache]` prefix for visibility

### NoOpCache (Null Object Pattern)

- Implements `Cache<T>` interface
- `get()` always returns `null`
- `set()` no-op (no-operation)
- `getOrFetch()` skips cache, calls fetcher directly
- Eliminates null checks from consumers

### UpstashCache (`src/shared/utils/upstash-cache.ts`)

- Singleton Redis client: `getRedisClient()` instantiates once
- Key prefixing: `"ws:"` namespace isolation
- Request coalescing: `Map<key, Promise<T>>` prevents duplicate fetches
- Graceful degradation: errors logged but not thrown on `get()`, `set()`
- `finally` block cleans up pending requests

## Request Coalescing

Problem: Multiple requests for same key during cache miss cause duplicate external calls.

Solution: Track in-flight requests in `pendingRequests` map:

- Cache miss detected
- Check if key already in pending map
- If yes, return existing promise (await same fetch)
- If no, start fetch, store promise, clean up on completion

See: `src/shared/utils/upstash-cache.ts:76-98`

## Usage Pattern

Services receive cache via constructor injection:

```typescript
class SomeClient {
  private cache;

  constructor(logger: FastifyBaseLogger) {
    this.cache = createCache<DataType>(TTL_MS, logger);
  }

  async getData(key: string): Promise<DataType> {
    return this.cache.getOrFetch(key, () => fetchExternal());
  }
}
```

## Consumer Examples

- `src/domains/game/services/steam-unified-api-client.ts:21-24`
- `src/domains/bvc/services/trii-client.ts:62`
- `src/domains/bvc/services/tradingview-client.ts:24-27`

## Benefits

- **Interface segregation**: Easy to mock in tests
- **Config-driven**: Toggle caching for local dev without code changes
- **Singleton pattern**: Redis client reused, not recreated
- **Stampede protection**: Request coalescing prevents N+1 external calls
- **Fault-tolerant**: Cache errors don't crash the service
- **Transparent**: Caller doesn't know NoOpCache vs UpstashCache

## Anti-patterns Avoided

- ❌ Direct Redis imports in services
- ❌ Cache logic scattered across codebase
- ❌ Stampeding herd on cache misses (duplicate fetches)
- ❌ Null checks everywhere (Null Object pattern eliminates these)
- ❌ Cache errors propagating to caller

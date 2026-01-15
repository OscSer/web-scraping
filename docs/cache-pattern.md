# Cache

## Pattern

- Interface-based abstraction
- Factory function selects implementation based on config
- Multiple implementations: production and disabled modes
- Request coalescing prevents stampeding herd problem

## Architecture

### Interface

Located in shared types directory.

```
get(key): Promise<T | null>
set(key, data): Promise<void>
getOrFetch(key, fetcher): Promise<T>
```

Small, focused interface with single responsibility.

### Factory

Search for the factory function in shared utils.

- Returns no-op implementation if caching is disabled
- Returns production cache implementation if enabled
- Creates child logger with cache-specific prefix for visibility

### No-Op Implementation (Null Object Pattern)

- Implements cache interface
- `get()` always returns null
- `set()` no-operation
- `getOrFetch()` skips cache, calls fetcher directly
- Eliminates null checks from consumers

### Production Cache Implementation

Located in shared utils.

- Singleton Redis client instantiated once
- Key prefixing for namespace isolation
- Request coalescing: tracks in-flight requests in a map to prevent duplicate fetches
- Graceful degradation: errors logged but not thrown on get/set operations
- Cleanup of pending requests via finally block

## Request Coalescing

Problem: Multiple requests for same key during cache miss cause duplicate external calls.

Solution: Track in-flight requests in a map:

- Cache miss detected
- Check if key already in pending map
- If yes, return existing promise (await same fetch)
- If no, start fetch, store promise, clean up on completion

Search for the pending requests map tracking logic in production cache implementation.

## Usage Pattern

Services receive cache via constructor injection:

```typescript
class ApiClient {
  private cache;

  constructor(logger) {
    this.cache = cacheFacory<DataType>(TTL_MS, logger);
  }

  async getData(key: string): Promise<DataType> {
    return this.cache.getOrFetch(key, () => fetchExternal());
  }
}
```

## Consumer Examples

Search for cache instantiation pattern in service implementations across domains. Look for the pattern where services initialize cache with TTL and logger in their constructors.

## Benefits

- **Interface segregation**: Easy to mock in tests
- **Config-driven**: Toggle caching for local dev without code changes
- **Singleton pattern**: Redis client reused, not recreated
- **Stampede protection**: Request coalescing prevents N+1 external calls
- **Fault-tolerant**: Cache errors don't crash the service
- **Transparent**: Caller doesn't know no-op vs production implementation

## Anti-patterns Avoided

- ❌ Direct Redis imports in services
- ❌ Cache logic scattered across codebase
- ❌ Stampeding herd on cache misses (duplicate fetches)
- ❌ Null checks everywhere (Null Object pattern eliminates these)
- ❌ Cache errors propagating to caller

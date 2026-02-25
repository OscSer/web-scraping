# Cache Pattern

## Abstraction and Selection

- Cache contract:
  - `src/shared/types/cache.ts`
- Factory and implementation selection:
  - `src/shared/utils/cache-factory.ts`
- Runtime config source:
  - `src/shared/config/index.ts`

## Implementations

- Disabled mode: No-op cache in `src/shared/utils/cache-factory.ts`.
- Enabled mode: Upstash-backed cache in `src/shared/utils/upstash-cache.ts`.
- Upstash client is lazily initialized once per process in `src/shared/utils/upstash-cache.ts`.

## Reliability Behavior

- `get` and `set` failures are logged and do not throw to callers.
- `getOrFetch` includes in-flight request coalescing per key via a pending-request map.
- Cache keys are namespaced with a `ws:` prefix before Redis operations.
- Reference: `src/shared/utils/upstash-cache.ts`.

## Where Cache Is Used

- BVC Trii stock-list caching:
  - `src/domains/bvc/services/trii-client.ts`
- BVC TradingView ticker caching:
  - `src/domains/bvc/services/tradingview-client.ts`
- Steam unified game-data caching:
  - `src/domains/game/services/steam-unified-api-client.ts`
- AI models caching:
  - `src/domains/ai/services/artificial-analysis-client.ts`

## Practical Rules

- Use `createCache` in services/clients instead of direct Redis imports.
- Keep TTL and cache-key design local to each service/client.

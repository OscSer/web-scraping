# Error Handling

## Pattern

- Custom error types with domain context
- Centralized error handler function
- Fallback cascade: primary source → secondary source → error response
- `Promise.allSettled` for fault-tolerant parallel operations

## Strategy Layers

### 1. Custom Error Types

- Typed errors with domain-specific context (e.g., HTTP status, message)
- See: `src/domains/game/types/errors.ts`
  - `SteamFetchError`: status code + text
  - `SteamParseError`: invalid response structure

### 2. Centralized Error Handler

- `handleSteamError<T>(..., fallbackValue: T): T`
- Logs contextually (warn vs. error based on error type)
- Always returns fallback value, never throws
- See: `src/domains/game/utils/steam-error-handler.ts`

### 3. Service Layer

- Catch typed errors in service methods
- Call `handleSteamError` to convert to fallback
- Return `null` or default value, not error
- Examples:
  - `src/domains/game/services/steam-details-api-client.ts:69-78`
  - `src/domains/game/services/steam-reviews-api-client.ts:89-97`

### 4. Route Layer

- Try-catch cascade with manual fallback attempt
- Primary source fails → log + try secondary source
- Both fail → return 502 error response
- See: `src/domains/bvc/routes/ticker.ts:35-95`

### 5. Parallel Operations

- `Promise.allSettled` for independent async operations
- Extract results and handle rejections individually
- Warn on specific failures, continue with fallback values
- See: `src/domains/game/services/steam-unified-api-client.ts:35-65`

## Benefits

- **Graceful degradation**: Service continues with fallback data
- **No cascading failures**: Errors localized to source
- **Contextual logging**: Error type determines log level
- **Testable**: Error paths explicit and verifiable
- **Resilient**: Multiple fallback sources improve availability

## Anti-patterns Avoided

- ❌ Throwing errors and letting caller handle
- ❌ Swallowing errors silently (always log)
- ❌ Generic try-catch without fallback strategy
- ❌ Losing error context in outer layers

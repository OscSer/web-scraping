# Error Handling

## Document Status

- This document includes **target patterns** and a **current implementation snapshot**.
- Error handling is currently domain-specific; not every domain uses the same layers.

### Current Implementation Snapshot

- **BVC domain**: route-level fallback cascade (`Trii -> TradingView`) with `404` on not-found and `502` on provider failures.
- **Game domain**: typed fetch/parse errors are thrown by clients; routes map failures to `502`; helper-based fallback is used for unexpected errors.
- **AI domain**: service throws typed errors and route maps failures to `502`.

## Pattern

- Custom error types with domain context
- Optional centralized helper function (domain-specific)
- Fallback cascade: primary source → secondary source → error response
- Parallel operations use try-all-gather approach for fault tolerance

## Implemented Patterns (Current)

### 1. Typed Errors with Shared Base

- Shared base error classes live in `src/shared/types/errors.ts`.
- Domains wrap them with contextual names (`Ai*`, `Bvc*`, `Steam*`) in each `src/domains/*/types/errors.ts`.
- This keeps behavior consistent while preserving domain language.

### 2. Provider Fallback Chain (BVC)

- Route-level fallback is explicit and sequential: `Trii -> TradingView`.
- Each provider is attempted at most once per request.
- Response mapping:
  - both providers return `null` -> `404 TICKER_NOT_FOUND`
  - any provider throws and no successful fallback -> `502 FETCH_ERROR`

### 3. Service-Level Error Policy

- Expected external-contract failures are raised as typed errors.
- Unexpected errors can be converted to fallback values where a safe default exists.
- Routes remain responsible for final HTTP error mapping.

## Strategy Layers

### 1. Custom Error Types

Located in shared and domain type directories:

- Shared base errors plus domain-specific wrappers
- Includes relevant metadata (HTTP status, message, response structure info)
- Enables different handling strategies based on error type

### 2. Centralized Error Handler

Located in domain utils:

- Handler function accepts error and fallback value
- Logs contextually according to domain needs
- Always returns fallback value, never throws
- Converts exceptions into recoverable states

Note: this layer is currently implemented only where needed, not in every domain.

### 3. Service Layer

Search for catch blocks in service implementations:

- Throw typed errors for expected fetch/parse contract failures
- Optionally convert unexpected exceptions into fallback values
- Keep fallback decisions local to the service's reliability requirements

### 4. Route Layer

Search for try-catch patterns in route handlers:

- Try-catch cascade with manual fallback attempt
- Primary source fails → log and attempt secondary source
- Both fail → return appropriate error response
- Maintains service availability by graceful degradation
- Keep provider fallback deterministic (no repeated provider calls in a single request)

### 5. Parallel Operations

Search for parallel operation patterns in service implementations:

- Promise.all-settled approach for independent async operations
- Extract results and handle rejections individually
- Warn on specific failures, continue with fallback values
- Prevents single failure from blocking all operations

## Benefits

- **Graceful degradation**: Service continues with fallback data
- **No cascading failures**: Errors localized to source
- **Contextual logging**: Error type determines log level
- **Testable**: Error paths explicit and verifiable
- **Resilient**: Multiple fallback sources improve availability

## Anti-patterns Avoided

- ❌ Throwing untyped/raw errors for domain-contract failures
- ❌ Swallowing errors silently (always log)
- ❌ Generic try-catch without fallback strategy
- ❌ Losing error context in outer layers

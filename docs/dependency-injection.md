# Dependency Injection

## Document Status

- This document mixes **target patterns** and **current implementation**.
- Dependencies are injected where they provide value; some services may not need every dependency type.

## Pattern

- Constructor/factory function injection
- Services created at domain level, passed to routes
- Logger injected to services that need logging context
- Rate limiter created internally by specific clients
- No global singletons or hardcoded instances

## Implemented Patterns (Current)

### 1. Minimal Constructor Dependencies

- Inject only dependencies a service actually uses.
- If a client does not log directly, it should not receive a logger only for symmetry.
- Example: `SteamDetailsApiClient` constructs with no logger dependency.

### 2. Route Dependencies as Explicit Contracts

- Route plugins declare exact service dependencies via typed options interfaces.
- This keeps route wiring explicit and test mocking straightforward.

### 3. Internalized Technical Policies

- Cross-cutting runtime policies that are local to a client (for example rate-limiter concurrency) may be instantiated internally.
- Shared cross-domain concerns (cache/config/error bases) remain in `shared/*`.

## Architecture Layers

### 1. Domain Layer (Plugin Entry)

Located in domain index files:

- Creates service instances via constructor
- Creates factory-based services for complex logic
- Passes instances to routes via plugin options interface

### 2. Route Layer

Receives injected services via options parameter:

- Routes are pure functions of their dependencies
- Services passed as object properties in options interface
- No internal service instantiation in routes

### 3. Service/Client Layer

Search for service constructors in domain service files:

- Accept dependencies as constructor parameters
- Store as instance properties
- Never import global singletons
- Some clients create their own rate limiter internally based on external API requirements

## Logger Injection (Specific Case)

Logger injection pattern:

- Domain creates a logger instance with domain-specific context prefix
- Passed to services in that domain that require logging
- Services may create child loggers with additional feature-specific context when needed
- No direct logger imports anywhere in the codebase

Logger hierarchy:

- Root logger from framework
- Domain-level child logger with domain prefix
- Service-level child logger with feature prefix

## Rate Limiter Usage

Rate limiting pattern:

- Specific clients create their own rate limiter instance in constructor
- Independent rate limiters per client with configurable concurrency
- Other clients may not require rate limiting depending on their external API policies
- Factory function in shared utils creates rate limiter instances

## Benefits

- **Testing**: Mock services, loggers, and rate limiters easily
- **No globals**: No module-level state to manage
- **Composability**: Stack dependencies logically
- **Context propagation**: Loggers carry domain context through layers
- **Flexibility**: Swap implementations (real cache vs. no-op cache)
- **Independent rate limiting**: Each service controls its own concurrency

## Anti-patterns Avoided

- ❌ Global singleton services
- ❌ Direct imports of framework utilities in service layer
- ❌ Hardcoded instances in multiple places
- ❌ Service initialization side-effects
- ❌ Shared resources between different external API clients
- ❌ Injecting unused dependencies just to keep constructor signatures uniform

# Dependency Injection

## Pattern

- Constructor/factory function injection
- Services created at domain level, passed to routes
- Logger type injected to all services
- Rate limiter created internally by specific clients
- No global singletons or hardcoded instances

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
- Passed to all services in that domain
- Services create child loggers with additional feature-specific context via the factory pattern
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

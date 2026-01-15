# Dependency Injection

## Pattern

- Constructor/factory function injection
- Services created at domain level, passed to routes
- `FastifyBaseLogger` type for logger DI
- No global singletons or hardcoded instances

## Architecture Layers

### 1. Domain Layer (Plugin Entry)

- Creates service instances: `new SomeClient(logger)`
- Creates factories: `createSomeService(logger)`
- Passes instances to routes via plugin options interface
- See: `src/domains/{bvc,game}/index.ts`

### 2. Route Layer

- Receives injected services via `opts` parameter
- Routes are pure functions of their dependencies
- Example: `TickerRoutesOptions` interface with `triiClient`, `tradingViewClient`
- See: `src/domains/bvc/routes/ticker.ts:13-22`

### 3. Service/Client Layer

- Accept dependencies in constructor
- Store as instance properties
- Never import global singletons
- See: `src/domains/bvc/services/trii-client.ts:61-68`

## Logger Injection (Specific Case)

- Domain creates: `const domainLogger = fastify.log.child({}, { msgPrefix: "[Domain]" })`
- Passed to all services in that domain
- Services create child loggers with additional context: `logger.child({}, { msgPrefix: "[Cache]" })`
- No direct `import { logger }` statements anywhere

### Key Logger Files

- Root setup: `src/index.ts:8`
- Domain setup: `src/domains/{bvc,game}/index.ts:7`
- Service usage: `src/domains/bvc/services/*-client.ts`
- Factory: `src/shared/utils/cache-factory.ts:28`

## Benefits

- **Testing**: Mock services + loggers easily
- **No globals**: No module-level state to manage
- **Composability**: Stack dependencies logically
- **Context propagation**: Loggers carry domain context through layers
- **Flexibility**: Swap implementations (real cache vs. NoOpCache)

## Anti-patterns Avoided

- ❌ Global singleton services
- ❌ Direct imports of logger/cache in services
- ❌ Hardcoded instances in multiple places
- ❌ Service initialization side-effects

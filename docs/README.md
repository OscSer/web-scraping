# Architecture & Patterns

Documentation of key architectural patterns and decisions in the codebase.

## Patterns

- **[Dependency Injection](./dependency-injection.md)** - Constructor/factory injection for services, loggers, and cache implementations. No global singletons.

- **[Error Handling](./error-handling.md)** - Multi-layered strategy with custom error types, centralized handlers, and fallback cascades. Graceful degradation.

- **[Cache](./cache.md)** - Interface-based abstraction with factory pattern. Request coalescing prevents stampeding herd. Config-driven implementations.

# Architecture & Patterns

Documentation of key architectural patterns and decisions in the codebase.

## About References

This documentation uses **conceptual references** instead of hardcoded file paths and line numbers. When you see "search for X pattern in Y directory", you can find the implementation by searching for that concept or pattern name in the files.

**Benefit**: Docs remain accurate when you refactor names, move files, or reorganize code. The patterns themselves are timeless; only the locations change.

## Patterns

- **[Domain Architecture](./domain-architecture.md)** - Multi-domain plugin pattern. Self-contained domains with services, routes, and types. Plugin bootstrap, service composition, and logger scoping.

- **[Dependency Injection](./dependency-injection.md)** - Constructor/factory injection for services, loggers, and cache implementations. No global singletons.

- **[Error Handling](./error-handling.md)** - Multi-layered strategy with custom error types, centralized handlers, and fallback cascades. Graceful degradation.

- **[Cache](./cache-pattern.md)** - Interface-based abstraction with factory pattern. Request coalescing prevents stampeding herd. Config-driven implementations.

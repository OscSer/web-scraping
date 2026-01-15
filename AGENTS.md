# AGENTS.md - Development Guidelines

## Build & Test Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to dist/
npm run lint         # Check code style (eslint src/**/*.ts)
npm run format       # Auto-format code (prettier --write src/**/*.ts)
npx tsc --noEmit     # Type check only
npx eslint src/file.ts --fix
npx prettier --write src/file.ts
```

## Code Style

### Naming

- **camelCase**: functions, variables, methods
- **PascalCase**: classes, interfaces, types
- **SCREAMING_SNAKE_CASE**: constants

### File Organization

- src/domains/{domain}/{types,services,routes}/
- src/shared/{utils,config,types}/
- Use index.ts for clean exports

### Error Handling

- Guard clauses first: `if (!user) return null;`
- Type guards: `if (typeof value !== "string") return false;`
- Async/await + try/catch
- Use `fastify.log.error()`, `.warn()`, `.info()`

### Key Patterns

- Config: frozen objects with `as const`
- API responses: `ApiResponse<T>` interface (success, data?, error?)
- Middleware: Fastify hooks (addHook)
- Concurrency: p-limit for rate limiting

## Project Info

- Runtime: Node.js >=22.0.0
- Framework: Fastify
- Cache: Upstash Redis
- Architecture: Domain-driven

## Architecture & Patterns

Documentation of architectural patterns is available in `docs/`. Automatically consult and reference these resources when analyzing the codebase or implementing features:

- `docs/domain-architecture.md` - Multi-domain plugin pattern
- `docs/dependency-injection.md` - Dependency injection strategy
- `docs/error-handling.md` - Error handling patterns
- `docs/cache-pattern.md` - Caching abstraction

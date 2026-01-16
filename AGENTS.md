# AGENTS.md

This project implements a web scraping service with a domain-driven architecture.

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run lint         # Check code style (eslint)
npm run format       # Auto-format code (prettier)
```

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

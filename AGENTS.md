# AGENTS.md

This project implements a web scraping service with a domain-driven architecture.

## Project Info

- Runtime: Node.js >=22.0.0
- Framework: Fastify
- Cache: Upstash Redis
- Architecture: Domain-driven

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run lint         # Check code style (eslint)
npm run format       # Auto-format code (prettier)
```

## Check Functionality

Run `npm run dev` in background and check the routes via `curl`:

```bash
curl "http://localhost:3000/game/info?url=https%3A%2F%2Fstore.steampowered.com%2Fapp%2F47780%2FDead_Space__2%2F"
```

## Logs

Project ID: `web-scraping-484120`
Service name: `web-scraping`

```bash
# Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=\"web-scraping\"" --project "web-scraping-484120"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=\"web-scraping\" AND severity>=ERROR" --project "web-scraping-484120"

# Cloud Build
gcloud logging read "resource.type=build" --project "web-scraping-484120" --limit 50
```

## Architecture & Patterns

Documentation of architectural patterns is available in `docs/`. Automatically consult and reference these resources when analyzing the codebase or implementing features:

- `docs/domain-architecture.md` - Multi-domain plugin pattern
- `docs/dependency-injection.md` - Dependency injection strategy
- `docs/error-handling.md` - Error handling patterns
- `docs/cache-pattern.md` - Caching abstraction

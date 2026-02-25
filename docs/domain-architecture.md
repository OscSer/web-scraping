# Domain Architecture

## Runtime Composition

- The app bootstraps Fastify and registers domain plugins in `src/index.ts`.
- Global API key auth is attached as an `onRequest` hook in `src/index.ts`.
- Each domain plugin creates domain-scoped dependencies and registers routes:
  - `src/domains/bvc/index.ts`
  - `src/domains/game/index.ts`
  - `src/domains/ai/index.ts`

## Domain Boundaries

- Domain code is grouped by feature:
  - `src/domains/bvc/`
  - `src/domains/game/`
  - `src/domains/ai/`
- Cross-domain concerns live in `src/shared/`.
- Domains do not call each other directly; integration happens through HTTP routes and shared utilities.

## Layer Responsibilities

- Route layer: input validation and HTTP response mapping.
  - `src/domains/bvc/routes/ticker.ts`
  - `src/domains/game/routes/info.ts`
  - `src/domains/ai/routes/ranking.ts`
- Service/client layer: external API calls, parsing, and orchestration.
  - `src/domains/bvc/services/trii-client.ts`
  - `src/domains/bvc/services/tradingview-client.ts`
  - `src/domains/game/services/steam-unified-api-client.ts`
  - `src/domains/ai/services/artificial-analysis-client.ts`
- Shared layer: config, helpers, cache abstractions, and base error types.
  - `src/shared/config/index.ts`
  - `src/shared/utils/cache-factory.ts`
  - `src/shared/types/errors.ts`

## Dependency Wiring

- Services are instantiated in each domain plugin entry file.
- Routes receive service instances via typed plugin options.
- Logging context is created with child loggers at domain boundaries.
- Main references:
  - `src/domains/bvc/index.ts`
  - `src/domains/game/index.ts`
  - `src/domains/ai/index.ts`

## Add a New Domain

1. Create `src/domains/<domain-name>/` with `index.ts`, `routes/`, `services/`, and `types/`.
2. Instantiate domain services in `src/domains/<domain-name>/index.ts`.
3. Register routes and pass dependencies through typed options.
4. Register the domain plugin in `src/index.ts`.
5. Reuse shared concerns from `src/shared/` instead of duplicating utilities.
